// Package contact は、利用者（ログインしていない人を含む）からの問い合わせを、運営にメールで送る。
package contact

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
)

// SMTPConfig は、送信に使うSMTPサーバーの設定。どれかが欠けていれば、問い合わせだけが 503 を返す。
type SMTPConfig struct {
	Host string
	Port string
	User string
	Pass string
	To   string
}

func (c SMTPConfig) ready() bool {
	return c.Host != "" && c.Port != "" && c.User != "" && c.Pass != "" && c.To != ""
}

// Message は、送るメール。
type Message struct {
	ReplyTo string
	Subject string
	Body    string
}

// Sender は、メールを送る。テストでは偽物に差し替える。
type Sender func(ctx context.Context, cfg SMTPConfig, m Message) error

type Handler struct {
	Pool    *pgxpool.Pool
	Config  SMTPConfig
	Send    Sender
	Limiter *ratelimit.Limiter
}

// アプリ全体の送信数を数えるときの key
const allSendersKey = "contact:all"

func (h Handler) SendContact(ctx context.Context, req openapi.SendContactRequestObject) (openapi.SendContactResponseObject, error) {
	// 隠した欄に値があるのは、画面を使わない自動送信。送れたと思わせて、何度も試されないようにする
	if req.Body.Website != nil && *req.Body.Website != "" {
		platform.Logger(ctx).Info("contact rejected by honeypot")
		return openapi.SendContact204Response{}, nil
	}
	subject, message := strings.TrimSpace(req.Body.Subject), strings.TrimSpace(req.Body.Message)
	if subject == "" {
		return nil, platform.Required("subject", "件名")
	}
	if message == "" {
		return nil, platform.Required("message", "お問い合わせ内容")
	}
	userID, signedIn := auth.UserID(ctx)
	replyTo := auth.Email(ctx)
	if email := strings.TrimSpace(ptrValue(req.Body.Email)); email != "" {
		if !isEmailAddress(email) {
			return nil, &platform.Error{Kind: platform.KindInvalid, Message: "入力内容に誤りがあります",
				Fields: []platform.FieldError{{Field: "email", Message: "メールアドレスの形式で入力してください"}}}
		}
		replyTo = email
	}
	if replyTo == "" {
		return nil, platform.Required("email", "返信先のメールアドレス")
	}
	if !h.Config.ready() {
		return nil, &platform.Error{Kind: platform.KindUnavailable, Message: "現在、お問い合わせを受け付けられない状態です。時間をおいて再度お試しください。"}
	}

	q := db.New(h.Pool)
	// 送れなかったときも数える。数えずに送ると、送信の失敗を繰り返させてSMTPに負担をかけられるため
	if signedIn {
		err := h.Limiter.Hit(ctx, q, userID, ratelimit.ContactUserDaily)
		if err != nil {
			return nil, err
		}
	} else {
		err := h.Limiter.HitByKey(ctx, q, ipKey(platform.ClientIPFrom(ctx)), ratelimit.ContactIPDaily)
		if err != nil {
			return nil, err
		}
	}
	if err := h.Limiter.HitByKey(ctx, q, allSendersKey, ratelimit.ContactAllDaily); err != nil {
		return nil, err
	}

	sender := []string{"ログイン: なし"}
	if signedIn {
		name := "未設定"
		if p, err := q.GetProfile(ctx, userID); err == nil && p.FullName != nil && *p.FullName != "" {
			name = *p.FullName
		}
		sender = []string{
			"登録ユーザー名: " + name,
			"ログインメール: " + auth.Email(ctx),
			"ユーザーID: " + userID.String(),
		}
	}
	err := h.Send(ctx, h.Config, Message{
		ReplyTo: replyTo,
		Subject: "[就活copilot お問い合わせ] " + subject,
		Body: strings.Join(append(sender,
			"返信先: "+replyTo,
			"",
			"お問い合わせ内容:",
			message,
		), "\n"),
	})
	if err != nil {
		platform.Logger(ctx).Error("failed to send contact email", "error", err)
		return nil, &platform.Error{Kind: platform.KindUnavailable, Message: "送信に失敗しました。時間をおいて再度お試しください。"}
	}
	return openapi.SendContact204Response{}, nil
}

func ptrValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// isEmailAddress は、「名前 <アドレス>」の形や改行を含まない、アドレスだけの文字列かを確かめる（Reply-To にそのまま入れるため）。
func isEmailAddress(s string) bool {
	a, err := mail.ParseAddress(s)
	return err == nil && a.Address == s
}

// ipKey は、IPアドレスごとの回数を数える key を作る。IPアドレスそのものはDBに残さないよう、ハッシュにする。
func ipKey(ip string) string {
	sum := sha256.Sum256([]byte(ip))
	return "contact:ip:" + hex.EncodeToString(sum[:])
}

// SendSMTP は、SMTPでメールを送る。ポート465は最初からTLSで、それ以外はSTARTTLSでつなぐ。
func SendSMTP(ctx context.Context, cfg SMTPConfig, m Message) error {
	addr := net.JoinHostPort(cfg.Host, cfg.Port)
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	var conn net.Conn
	var err error
	if cfg.Port == "465" {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: cfg.Host})
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("connect smtp: %w", err)
	}
	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return fmt.Errorf("start smtp: %w", err)
	}
	defer func() { _ = client.Close() }()
	if cfg.Port != "465" {
		if err := client.StartTLS(&tls.Config{ServerName: cfg.Host}); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}
	if err := client.Auth(smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}
	if err := client.Mail(cfg.User); err != nil {
		return fmt.Errorf("smtp mail: %w", err)
	}
	if err := client.Rcpt(cfg.To); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err := w.Write([]byte(compose(cfg, m))); err != nil {
		return fmt.Errorf("write message: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("finish message: %w", err)
	}
	return client.Quit()
}

// compose は、件名と本文をUTF-8のメールにする。件名は日本語を含むので MIME でエンコードする。
func compose(cfg SMTPConfig, m Message) string {
	headers := []string{
		"From: " + mimeWord("就活copilot") + " <" + cfg.User + ">",
		"To: " + cfg.To,
		"Subject: " + mimeWord(m.Subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
	}
	if m.ReplyTo != "" && !strings.ContainsAny(m.ReplyTo, "\r\n") {
		headers = append(headers, "Reply-To: "+m.ReplyTo)
	}
	return strings.Join(headers, "\r\n") + "\r\n\r\n" + strings.ReplaceAll(m.Body, "\n", "\r\n")
}

func mimeWord(s string) string {
	return mimeEncoder.Encode("UTF-8", s)
}
