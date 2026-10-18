package platform

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type recordingReporter struct {
	reported []UnexpectedError
	err      error
}

func (r *recordingReporter) Report(_ context.Context, e UnexpectedError) error {
	r.reported = append(r.reported, e)
	return r.err
}

func serveWithReporter(reporter ErrorReporter, h http.HandlerFunc, req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	Chain(h, ReportErrors(reporter), Recover).ServeHTTP(rec, req)
	return rec
}

func TestWriteErrorReportsUnexpectedErrorWithStackTrace(t *testing.T) {
	reporter := &recordingReporter{}
	serveWithReporter(reporter, func(w http.ResponseWriter, r *http.Request) {
		WriteError(w, r, errors.New("connection refused"))
	}, httptest.NewRequest(http.MethodPost, "/v1/companies?name=secret", nil))

	if len(reporter.reported) != 1 {
		t.Fatalf("reported %d errors, want 1", len(reporter.reported))
	}
	got := reporter.reported[0]
	if got.Method != http.MethodPost || got.Path != "/v1/companies" {
		t.Errorf("method/path = %s %s, want POST /v1/companies without the query", got.Method, got.Path)
	}
	if !strings.HasPrefix(got.Message, "connection refused\n\ngoroutine ") {
		t.Errorf("message = %q, want the error followed by a Go stack trace", got.Message)
	}
}

func TestWriteErrorDoesNotReportExpectedErrors(t *testing.T) {
	// 503 も送らない。AIの上流やSMTPの一時的な失敗は利用者に再試行を促すもので、送ると通知が騒がしくなる
	for _, kind := range []Kind{KindInvalid, KindUnauthorized, KindForbidden, KindNotFound, KindConflict, KindRateLimited, KindUnavailable} {
		reporter := &recordingReporter{}
		serveWithReporter(reporter, func(w http.ResponseWriter, r *http.Request) {
			WriteError(w, r, &Error{Kind: kind, Message: "メッセージ"})
		}, httptest.NewRequest(http.MethodGet, "/v1/things", nil))

		if len(reporter.reported) != 0 {
			t.Errorf("kind %d: reported %v, want nothing", kind, reporter.reported)
		}
	}
}

func TestRecoverReportsPanicWithItsOwnStackTrace(t *testing.T) {
	reporter := &recordingReporter{}
	rec := serveWithReporter(reporter, func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}, httptest.NewRequest(http.MethodGet, "/v1/calendar-feed/secret-token", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
	if len(reporter.reported) != 1 {
		t.Fatalf("reported %d errors, want 1", len(reporter.reported))
	}
	got := reporter.reported[0]
	if !strings.HasPrefix(got.Message, "panic: boom\n\ngoroutine ") {
		t.Errorf("message = %q, want the panic value followed by a Go stack trace", got.Message)
	}
	if n := strings.Count(got.Message, "[running]:"); n != 1 {
		t.Errorf("message has %d stack traces, want only the one where the panic happened", n)
	}
	if got.Path != calendarFeedPrefix+"***" {
		t.Errorf("path = %q, want the feed token masked", got.Path)
	}
}

func TestWriteErrorKeepsResponseWhenReportFails(t *testing.T) {
	handler := func(w http.ResponseWriter, r *http.Request) { WriteError(w, r, errors.New("boom")) }
	want := serveWithReporter(nil, handler, httptest.NewRequest(http.MethodGet, "/v1/things", nil))
	got := serveWithReporter(&recordingReporter{err: errors.New("unavailable")}, handler, httptest.NewRequest(http.MethodGet, "/v1/things", nil))

	if got.Code != want.Code || got.Body.String() != want.Body.String() {
		t.Errorf("response = %d %s, want the same as without a reporter: %d %s", got.Code, got.Body, want.Code, want.Body)
	}
}
