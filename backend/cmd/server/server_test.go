package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth/authtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
)

func serve(t *testing.T, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	verifier, err := auth.NewVerifier(t.Context(), authtest.NewIssuer(t).URL)
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	handler, err := newHandler(verifier)
	if err != nil {
		t.Fatalf("newHandler: %v", err)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func decodeProblem(t *testing.T, rec *httptest.ResponseRecorder) openapi.Problem {
	t.Helper()
	if got := rec.Header().Get("Content-Type"); got != "application/problem+json" {
		t.Fatalf("Content-Type = %q, want application/problem+json", got)
	}
	var p openapi.Problem
	if err := json.NewDecoder(rec.Body).Decode(&p); err != nil {
		t.Fatalf("decode problem: %v", err)
	}
	return p
}

func TestHealthReturnsOK(t *testing.T) {
	rec := serve(t, http.MethodGet, "/v1/health")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body openapi.Health
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Status != openapi.Ok {
		t.Errorf("status field = %q, want ok", body.Status)
	}
	if rec.Header().Get("X-Request-Id") == "" {
		t.Error("X-Request-Id header is missing")
	}
}

func TestUnknownPathReturnsNotFoundProblem(t *testing.T) {
	rec := serve(t, http.MethodGet, "/v1/unknown")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
	p := decodeProblem(t, rec)
	if p.Code != "not_found" || p.Status != http.StatusNotFound {
		t.Errorf("problem = %+v, want code not_found and status 404", p)
	}
}

func TestWrongMethodReturnsMethodNotAllowedProblem(t *testing.T) {
	rec := serve(t, http.MethodPost, "/v1/health")

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", rec.Code)
	}
	if p := decodeProblem(t, rec); p.Code != "method_not_allowed" {
		t.Errorf("code = %q, want method_not_allowed", p.Code)
	}
}
