package contact

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth/authtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
)

var config = SMTPConfig{Host: "smtp.example.com", Port: "465", User: "bot@example.com", Pass: "x", To: "owner@example.com"}

// mailbox は、送ったメールを貯める偽物の Sender を持つ。
type mailbox struct {
	sent []Message
}

func (m *mailbox) send(_ context.Context, _ SMTPConfig, msg Message) error {
	m.sent = append(m.sent, msg)
	return nil
}

// newHandler は、問い合わせの回数（アプリ全体の分を含む）を数え直した状態のハンドラーを作る。
// アプリ全体の回数は実行をまたいで同じ行に貯まるので、消さないと何度か実行するうちに上限に達する。
func newHandler(t *testing.T, pool *pgxpool.Pool, box *mailbox) Handler {
	t.Helper()
	if _, err := pool.Exec(t.Context(), `delete from api_app_rate_limits where bucket like 'contact_daily%'`); err != nil {
		t.Fatalf("reset contact rate limits: %v", err)
	}
	return Handler{Pool: pool, Config: config, Send: box.send, Limiter: ratelimit.NewLimiter(ratelimit.DefaultAppLimits)}
}

// loggedIn は、ログイン済みのユーザーとしてハンドラーを呼べるコンテキストを作る（auth.Authenticate を通す）。
func loggedIn(t *testing.T, userID uuid.UUID, email string) context.Context {
	t.Helper()
	issuer := authtest.NewIssuer(t)
	v, err := auth.NewVerifier(t.Context(), issuer.URL)
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	token := issuer.SignWithEmail(t, issuer.Claims(userID.String()), email)
	var ctx context.Context
	h := platform.ClientIP(v.Authenticate(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { ctx = r.Context() })))
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	h.ServeHTTP(httptest.NewRecorder(), req)
	return ctx
}

// anonymous は、ログインしていない人が ip から送ったときのコンテキストを作る（platform.ClientIP を通す）。
func anonymous(ip string) context.Context {
	var ctx context.Context
	h := platform.ClientIP(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { ctx = r.Context() }))
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.Header.Set("X-Real-IP", ip)
	h.ServeHTTP(httptest.NewRecorder(), req)
	return ctx
}

func body(email string) openapi.SendContactRequestObject {
	b := &openapi.SendContactJSONRequestBody{Subject: "件名", Message: "本文"}
	if email != "" {
		b.Email = &email
	}
	return openapi.SendContactRequestObject{Body: b}
}

func errorKind(err error) platform.Kind {
	var appErr *platform.Error
	if errors.As(err, &appErr) {
		return appErr.Kind
	}
	return 0
}

func TestSendContactMailsTheOwnerWithSenderInfo(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	if _, err := pool.Exec(t.Context(), `insert into profiles (id, full_name) values ($1, '山田太郎')`, userID); err != nil {
		t.Fatalf("insert profile: %v", err)
	}
	box := &mailbox{}
	h := newHandler(t, pool, box)

	_, err := h.SendContact(loggedIn(t, userID, "taro@example.com"), openapi.SendContactRequestObject{
		Body: &openapi.SendContactJSONRequestBody{Subject: " 不具合 ", Message: "画面が開きません"},
	})
	if err != nil {
		t.Fatalf("SendContact: %v", err)
	}

	if len(box.sent) != 1 {
		t.Fatalf("sent %d mails, want 1", len(box.sent))
	}
	sent := box.sent[0]
	if sent.Subject != "[就活copilot お問い合わせ] 不具合" || sent.ReplyTo != "taro@example.com" {
		t.Errorf("sent = %+v, want the trimmed subject and the sender as reply-to", sent)
	}
	for _, want := range []string{"山田太郎", "taro@example.com", userID.String(), "画面が開きません"} {
		if !strings.Contains(sent.Body, want) {
			t.Errorf("body %q does not contain %q", sent.Body, want)
		}
	}
}

func TestSendContactWithoutLoginRepliesToTheGivenEmail(t *testing.T) {
	pool := dbtest.Connect(t)
	box := &mailbox{}
	h := newHandler(t, pool, box)

	_, err := h.SendContact(anonymous("203.0.113.1"), body(" guest@example.com "))
	if err != nil {
		t.Fatalf("SendContact: %v", err)
	}

	if len(box.sent) != 1 || box.sent[0].ReplyTo != "guest@example.com" {
		t.Fatalf("sent = %+v, want one mail replying to guest@example.com", box.sent)
	}
	if !strings.Contains(box.sent[0].Body, "ログイン: なし") {
		t.Errorf("body %q does not say the sender was not logged in", box.sent[0].Body)
	}
}

func TestSendContactWithoutLoginRequiresAValidEmail(t *testing.T) {
	pool := dbtest.Connect(t)
	box := &mailbox{}
	h := newHandler(t, pool, box)

	for _, email := range []string{"", "not-an-email", "Guest <guest@example.com>", "a@example.com\r\nBcc: b@example.com"} {
		_, err := h.SendContact(anonymous("203.0.113.1"), body(email))

		var appErr *platform.Error
		if !errors.As(err, &appErr) || appErr.Kind != platform.KindInvalid || len(appErr.Fields) != 1 || appErr.Fields[0].Field != "email" {
			t.Errorf("email %q: error = %v, want invalid email", email, err)
		}
	}
	if len(box.sent) != 0 {
		t.Errorf("sent %d mails, want none", len(box.sent))
	}
}

func TestSendContactIgnoresSubmissionsWithTheHoneypotFilled(t *testing.T) {
	pool := dbtest.Connect(t)
	box := &mailbox{}
	h := newHandler(t, pool, box)
	req := body("bot@example.com")
	website := "https://spam.example.com"
	req.Body.Website = &website

	if _, err := h.SendContact(anonymous("203.0.113.1"), req); err != nil {
		t.Fatalf("SendContact: %v, want it to look successful", err)
	}

	if len(box.sent) != 0 {
		t.Errorf("sent %d mails, want none", len(box.sent))
	}
}

func TestSendContactWithoutLoginIsLimitedPerIP(t *testing.T) {
	pool := dbtest.Connect(t)
	box := &mailbox{}
	h := newHandler(t, pool, box)

	for i := range ratelimit.ContactIPDaily("").Max {
		if _, err := h.SendContact(anonymous("203.0.113.1"), body("guest@example.com")); err != nil {
			t.Fatalf("send %d: %v, want allowed", i+1, err)
		}
	}
	if _, err := h.SendContact(anonymous("203.0.113.1"), body("guest@example.com")); errorKind(err) != platform.KindRateLimited {
		t.Fatalf("send over the limit: %v, want rate limited", err)
	}
	if _, err := h.SendContact(anonymous("203.0.113.2"), body("guest@example.com")); err != nil {
		t.Errorf("send from another IP: %v, want allowed", err)
	}
	if len(box.sent) != ratelimit.ContactIPDaily("").Max+1 {
		t.Errorf("sent %d mails, want %d", len(box.sent), ratelimit.ContactIPDaily("").Max+1)
	}
}

func TestSendContactIsLimitedPerUser(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	h := newHandler(t, pool, &mailbox{})
	ctx := loggedIn(t, userID, "taro@example.com")

	for i := range ratelimit.ContactUserDaily.Max {
		if _, err := h.SendContact(ctx, body("")); err != nil {
			t.Fatalf("send %d: %v, want allowed", i+1, err)
		}
	}
	if _, err := h.SendContact(ctx, body("")); errorKind(err) != platform.KindRateLimited {
		t.Errorf("send over the limit: %v, want rate limited", err)
	}
}

func TestSendContactStopsWhenTheWholeAppReachesTheDailyLimit(t *testing.T) {
	pool := dbtest.Connect(t)
	box := &mailbox{}
	h := newHandler(t, pool, box)
	if _, err := pool.Exec(t.Context(),
		`insert into api_app_rate_limits (bucket, window_start, count) values ($1, now(), $2)`,
		ratelimit.ContactAppDaily.Bucket, ratelimit.ContactAppDaily.Max); err != nil {
		t.Fatalf("fill the app-wide count: %v", err)
	}

	if _, err := h.SendContact(anonymous("203.0.113.9"), body("guest@example.com")); errorKind(err) != platform.KindRateLimited {
		t.Errorf("send after the app-wide limit: %v, want rate limited", err)
	}
	if len(box.sent) != 0 {
		t.Errorf("sent %d mails, want none", len(box.sent))
	}
}

func TestSendContactWithoutSMTPConfigIsUnavailable(t *testing.T) {
	pool := dbtest.Connect(t)
	h := newHandler(t, pool, &mailbox{})
	h.Config = SMTPConfig{}
	h.Send = func(context.Context, SMTPConfig, Message) error { t.Error("Send was called"); return nil }

	_, err := h.SendContact(anonymous("203.0.113.1"), body("guest@example.com"))

	if errorKind(err) != platform.KindUnavailable {
		t.Errorf("error = %v, want unavailable", err)
	}
}
