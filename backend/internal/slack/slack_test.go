package slack

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// webhook は、Slack の Incoming Webhook の偽物。届いた通知の本文を貯める。
type webhook struct {
	server *httptest.Server
	texts  []string
}

func newWebhook(t *testing.T, status int) *webhook {
	t.Helper()
	w := &webhook{}
	w.server = httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		var body struct{ Text string }
		raw, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(raw, &body); err != nil {
			t.Errorf("decode body %q: %v", raw, err)
		}
		w.texts = append(w.texts, body.Text)
		rw.WriteHeader(status)
	}))
	t.Cleanup(w.server.Close)
	return w
}

func newLogger(t *testing.T, w *webhook) (*slog.Logger, *bytes.Buffer) {
	t.Helper()
	var local bytes.Buffer
	return slog.New(NewHandler(slog.NewTextHandler(&local, nil), w.server.URL, "backend")), &local
}

func TestWarningsAndErrorsAreSentButInfoIsNot(t *testing.T) {
	w := newWebhook(t, http.StatusOK)
	logger, local := newLogger(t, w)

	logger.Info("request")
	logger.Warn("app-wide rate limit reached", "bucket", "ai_daily")
	logger.Error("unexpected error", "error", "db down")

	want := []string{
		"[backend] WARN: app-wide rate limit reached\nbucket: ai_daily",
		"[backend] ERROR: unexpected error\nerror: db down",
	}
	if strings.Join(w.texts, "|") != strings.Join(want, "|") {
		t.Errorf("sent %q, want %q", w.texts, want)
	}
	if !strings.Contains(local.String(), "msg=request") {
		t.Errorf("local log = %q, want every level still written locally", local.String())
	}
}

func TestOnlyAllowedAttributesAreSent(t *testing.T) {
	w := newWebhook(t, http.StatusOK)
	logger, _ := newLogger(t, w)

	logger.With("request_id", "req-1", "user_id", "u-1").Error("unexpected error", "error", "boom", "email", "a@example.com")

	if len(w.texts) != 1 {
		t.Fatalf("sent %d messages, want 1", len(w.texts))
	}
	got := w.texts[0]
	if !strings.Contains(got, "request_id: req-1") || !strings.Contains(got, "error: boom") {
		t.Errorf("sent %q, want request_id and error", got)
	}
	if strings.Contains(got, "u-1") || strings.Contains(got, "a@example.com") {
		t.Errorf("sent %q, want personal values left out", got)
	}
}

func TestSlackFormattingCharactersAreEscaped(t *testing.T) {
	w := newWebhook(t, http.StatusOK)
	logger, _ := newLogger(t, w)

	logger.Error("unexpected error", "error", "<!channel> & <nil>")

	if len(w.texts) != 1 || !strings.Contains(w.texts[0], "&lt;!channel&gt; &amp; &lt;nil&gt;") {
		t.Errorf("sent %q, want &, < and > escaped", w.texts)
	}
}

func TestFailedSendIsLoggedLocallyOnly(t *testing.T) {
	w := newWebhook(t, http.StatusInternalServerError)
	logger, local := newLogger(t, w)

	logger.Error("unexpected error", "error", "boom")

	if len(w.texts) != 1 {
		t.Errorf("sent %d messages, want only the original one (not the failure)", len(w.texts))
	}
	if !strings.Contains(local.String(), "failed to send log to slack") || !strings.Contains(local.String(), "status 500") {
		t.Errorf("local log = %q, want the failure", local.String())
	}
}

func TestWithoutWebhookURLLogsAreOnlyWrittenLocally(t *testing.T) {
	next := slog.NewTextHandler(io.Discard, nil)
	if got := NewHandler(next, "", "backend"); got != next {
		t.Errorf("handler = %T, want the local handler as is", got)
	}
}
