package platform

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientIPPrefersRealIPHeaderOverRemoteAddr(t *testing.T) {
	var seen string
	h := ClientIP(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { seen = ClientIPFrom(r.Context()) }))

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Real-IP", "203.0.113.7")
	req.Header.Set("X-Forwarded-For", "198.51.100.1")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if seen != "203.0.113.7" {
		t.Errorf("with X-Real-IP: %q, want 203.0.113.7", seen)
	}

	req = httptest.NewRequest(http.MethodPost, "/", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.1")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if seen != "10.0.0.1" {
		t.Errorf("without X-Real-IP: %q, want the remote address 10.0.0.1 (X-Forwarded-For is not trusted)", seen)
	}
}

func TestRequestIDGeneratesIDWhenMissing(t *testing.T) {
	var seen string
	h := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen, _ = r.Context().Value(requestIDKey{}).(string)
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if seen == "" {
		t.Fatal("request ID is not in the context")
	}
	if got := rec.Header().Get("X-Request-Id"); got != seen {
		t.Errorf("header = %q, want the same ID as the context %q", got, seen)
	}
}

func TestRequestIDKeepsCallerID(t *testing.T) {
	h := RequestID(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-Id", "caller-id")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Request-Id"); got != "caller-id" {
		t.Errorf("header = %q, want caller-id", got)
	}
}

func TestRecoverTurnsPanicIntoInternalError(t *testing.T) {
	h := Recover(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
}

func TestChainRunsFirstMiddlewareOutermost(t *testing.T) {
	var order []string
	mark := func(name string) Middleware {
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				order = append(order, name)
				next.ServeHTTP(w, r)
			})
		}
	}
	h := Chain(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		order = append(order, "handler")
	}), mark("first"), mark("second"))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))

	want := []string{"first", "second", "handler"}
	if len(order) != len(want) {
		t.Fatalf("order = %v, want %v", order, want)
	}
	for i := range want {
		if order[i] != want[i] {
			t.Fatalf("order = %v, want %v", order, want)
		}
	}
}
