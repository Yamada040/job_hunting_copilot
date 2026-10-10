package contact

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth/authtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

var config = SMTPConfig{Host: "smtp.example.com", Port: "465", User: "bot@example.com", Pass: "x", To: "owner@example.com"}

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
	h := v.Authenticate(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { ctx = r.Context() }))
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	h.ServeHTTP(httptest.NewRecorder(), req)
	return ctx
}

func TestSendContactMailsTheOwnerWithSenderInfo(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	if _, err := pool.Exec(t.Context(), `insert into profiles (id, full_name) values ($1, '山田太郎')`, userID); err != nil {
		t.Fatalf("insert profile: %v", err)
	}
	var sent Message
	h := Handler{Pool: pool, Config: config, Send: func(_ context.Context, _ SMTPConfig, m Message) error {
		sent = m
		return nil
	}}

	_, err := h.SendContact(loggedIn(t, userID, "taro@example.com"), openapi.SendContactRequestObject{
		Body: &openapi.SendContactJSONRequestBody{Subject: " 不具合 ", Message: "画面が開きません"},
	})
	if err != nil {
		t.Fatalf("SendContact: %v", err)
	}

	if sent.Subject != "[就活copilot お問い合わせ] 不具合" || sent.ReplyTo != "taro@example.com" {
		t.Errorf("sent = %+v, want the trimmed subject and the sender as reply-to", sent)
	}
	for _, want := range []string{"山田太郎", "taro@example.com", userID.String(), "画面が開きません"} {
		if !strings.Contains(sent.Body, want) {
			t.Errorf("body %q does not contain %q", sent.Body, want)
		}
	}
}

func TestSendContactWithoutSMTPConfigIsUnavailable(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	h := Handler{Pool: pool, Send: func(context.Context, SMTPConfig, Message) error { t.Error("Send was called"); return nil }}

	_, err := h.SendContact(loggedIn(t, userID, "a@example.com"), openapi.SendContactRequestObject{
		Body: &openapi.SendContactJSONRequestBody{Subject: "件名", Message: "本文"},
	})

	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != platform.KindUnavailable {
		t.Errorf("error = %v, want unavailable", err)
	}
}
