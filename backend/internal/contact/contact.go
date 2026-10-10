// Package contact は、ログイン中のユーザーからの問い合わせを、運営にメールで送る。
package contact

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
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
	Pool   *pgxpool.Pool
	Config SMTPConfig
	Send   Sender
}

func (h Handler) SendContact(ctx context.Context, req openapi.SendContactRequestObject) (openapi.SendContactResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	subject, message := strings.TrimSpace(req.Body.Subject), strings.TrimSpace(req.Body.Message)
	if subject == "" {
		return nil, platform.Required("subject", "件名")
	}
	if message == "" {
		return nil, platform.Required("message", "お問い合わせ内容")
	}
	if !h.Config.ready() {
		return nil, &platform.Error{Kind: platform.KindUnavailable, Message: "メール送信の設定が完了していないため、現在お問い合わせを受け付けられません。"}
	}

	name := "未設定"
	if p, err := db.New(h.Pool).GetProfile(ctx, userID); err == nil && p.FullName != nil && *p.FullName != "" {
		name = *p.FullName
	}
	email := auth.Email(ctx)
	err = h.Send(ctx, h.Config, Message{
		ReplyTo: email,
		Subject: "[就活copilot お問い合わせ] " + subject,
		Body: strings.Join([]string{
			"登録ユーザー名: " + name,
			"ログインメール: " + email,
			"ユーザーID: " + userID.String(),
			"",
			"お問い合わせ内容:",
			message,
		}, "\n"),
	})
	if err != nil {
		platform.Logger(ctx).Error("failed to send contact email", "error", err)
		return nil, &platform.Error{Kind: platform.KindUnavailable, Message: "送信に失敗しました。時間をおいて再度お試しください。"}
	}
	return openapi.SendContact204Response{}, nil
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
