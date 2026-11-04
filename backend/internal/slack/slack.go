// Package slack は、運営がすぐに知るべきログ（Warn 以上）を Slack の Incoming Webhook に送る。
package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// sendTimeout は、1件の送信を待つ上限。送り終えてからログの呼び出し元に戻るので、応答がこの分だけ延びうる。
// 裏で送らないのは、Vercel の関数は応答を返すと止められうるため（platform の reportUnexpected と同じ理由）
const sendTimeout = 2 * time.Second

// maxValueLength は、1つの値を送る長さの上限。Slack の1通の上限（4万文字）より十分短くし、通知を読みやすく保つ
const maxValueLength = 1000

// sentKeys は、ログの属性のうち Slack に送るもの。ログには調べるための値を自由に足せるよう、送るものだけを決めておき、
// 個人に結び付く値（ユーザーID・メールアドレスなど）を後から足しても外に出ないようにする
var sentKeys = map[string]bool{"error": true, "bucket": true, "request_id": true}

// Handler は、next に書いたうえで、Warn 以上のログを Slack にも送る slog.Handler。
type Handler struct {
	next       slog.Handler
	client     *http.Client
	webhookURL string
	service    string
	// attrs は、With で付けた属性のうち、送るもの
	attrs []slog.Attr
}

// NewHandler は、webhookURL が空なら next をそのまま返す（Slack に送らない）。
// service は、通知の先頭に付けて、どこから届いたかを分ける名前。
func NewHandler(next slog.Handler, webhookURL, service string) slog.Handler {
	if webhookURL == "" {
		return next
	}
	return &Handler{next: next, client: &http.Client{Timeout: sendTimeout}, webhookURL: webhookURL, service: service}
}

func (h *Handler) Enabled(ctx context.Context, level slog.Level) bool {
	return level >= slog.LevelWarn || h.next.Enabled(ctx, level)
}

func (h *Handler) Handle(ctx context.Context, r slog.Record) error {
	var err error
	if h.next.Enabled(ctx, r.Level) {
		err = h.next.Handle(ctx, r)
	}
	if r.Level < slog.LevelWarn {
		return err
	}
	if sendErr := h.send(ctx, r); sendErr != nil {
		// Slack に送れなかったことを Slack に送ろうとして繰り返さないよう、next にだけ書く
		_ = h.next.Handle(ctx, recordWith(slog.LevelError, "failed to send log to slack", slog.String("error", sendErr.Error())))
	}
	return err
}

func (h *Handler) WithAttrs(attrs []slog.Attr) slog.Handler {
	c := *h
	c.next = h.next.WithAttrs(attrs)
	c.attrs = append(append([]slog.Attr{}, h.attrs...), sent(attrs)...)
	return &c
}

// WithGroup は、グループの名前を Slack の通知には付けない。このアプリはグループを使っておらず、送る属性は名前で決めているため
func (h *Handler) WithGroup(name string) slog.Handler {
	c := *h
	c.next = h.next.WithGroup(name)
	return &c
}

func (h *Handler) send(ctx context.Context, r slog.Record) error {
	lines := []string{fmt.Sprintf("[%s] %s: %s", h.service, r.Level, r.Message)}
	attrs := append([]slog.Attr{}, h.attrs...)
	r.Attrs(func(a slog.Attr) bool {
		attrs = append(attrs, sent([]slog.Attr{a})...)
		return true
	})
	for _, a := range attrs {
		lines = append(lines, a.Key+": "+truncate(a.Value.String()))
	}
	body, err := json.Marshal(map[string]string{"text": escape(strings.Join(lines, "\n"))})
	if err != nil {
		return fmt.Errorf("encode message: %w", err)
	}
	// ログの呼び出し元のリクエストが取り消されていても、起きたことは知らせたい
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), sendTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.webhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := h.client.Do(req)
	if err != nil {
		// URL（秘密の値）を含むので、エラーの文言をそのまま返さない
		return fmt.Errorf("post webhook failed")
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 200))
		return fmt.Errorf("post webhook: status %d: %s", resp.StatusCode, detail)
	}
	return nil
}

func sent(attrs []slog.Attr) []slog.Attr {
	var out []slog.Attr
	for _, a := range attrs {
		if sentKeys[a.Key] {
			out = append(out, a)
		}
	}
	return out
}

func recordWith(level slog.Level, message string, attrs ...slog.Attr) slog.Record {
	r := slog.NewRecord(time.Now(), level, message, 0)
	r.AddAttrs(attrs...)
	return r
}

func truncate(s string) string {
	runes := []rune(s)
	if len(runes) <= maxValueLength {
		return s
	}
	return string(runes[:maxValueLength]) + "…"
}

// escape は、Slack が書式として読む &・<・> を文字のまま出す（エラーの文言の <nil> などがリンクや宛先に化けないように）。
func escape(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;").Replace(s)
}
