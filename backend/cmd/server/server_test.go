package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth/authtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/profile"
)

type okPinger struct{}

func (okPinger) Ping(context.Context) error { return nil }

// memoryProfiles は、DBの代わりにプロフィールをメモリに持つ。
type memoryProfiles struct{}

func (memoryProfiles) Get(_ context.Context, userID uuid.UUID) (profile.Profile, error) {
	return profile.Profile{ID: userID, Level: 1}, nil
}

func (memoryProfiles) Update(_ context.Context, userID uuid.UUID, u profile.Update) (profile.Profile, error) {
	return profile.Profile{ID: userID, FullName: u.FullName, Level: 1}, nil
}

func (memoryProfiles) Delete(context.Context, uuid.UUID) error { return nil }

type testServer struct {
	t       *testing.T
	issuer  *authtest.Issuer
	handler http.Handler
}

func newTestServer(t *testing.T) *testServer {
	t.Helper()
	issuer := authtest.NewIssuer(t)
	verifier, err := auth.NewVerifier(t.Context(), issuer.URL)
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	handler, err := newHandler(verifier, deps{
		db:      okPinger{},
		profile: profile.NewService(memoryProfiles{}, nil),
	})
	if err != nil {
		t.Fatalf("newHandler: %v", err)
	}
	return &testServer{t: t, issuer: issuer, handler: handler}
}

// do は、userID が uuid.Nil でなければそのユーザーとしてログインした状態でリクエストする。
func (s *testServer) do(method, path string, userID uuid.UUID, body string) *httptest.ResponseRecorder {
	s.t.Helper()
	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, reader)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if userID != uuid.Nil {
		req.Header.Set("Authorization", "Bearer "+s.issuer.Sign(s.t, s.issuer.Claims(userID.String())))
	}
	rec := httptest.NewRecorder()
	s.handler.ServeHTTP(rec, req)
	return rec
}

func serve(t *testing.T, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	return newTestServer(t).do(method, path, uuid.Nil, "")
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

func TestMeRequiresLogin(t *testing.T) {
	rec := serve(t, http.MethodGet, "/v1/me")

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
	if p := decodeProblem(t, rec); p.Code != "unauthorized" {
		t.Errorf("code = %q, want unauthorized", p.Code)
	}
}

func TestDeleteMeRequiresLogin(t *testing.T) {
	rec := serve(t, http.MethodDelete, "/v1/me")

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestDeleteMeReturnsNoContent(t *testing.T) {
	rec := newTestServer(t).do(http.MethodDelete, "/v1/me", uuid.New(), "")

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204: %s", rec.Code, rec.Body)
	}
}

func TestMeReturnsLoggedInUser(t *testing.T) {
	userID := uuid.New()

	rec := newTestServer(t).do(http.MethodGet, "/v1/me", userID, "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", rec.Code, rec.Body)
	}
	var me openapi.Me
	if err := json.NewDecoder(rec.Body).Decode(&me); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if me.Id != userID {
		t.Errorf("id = %s, want the user in the token %s", me.Id, userID)
	}
}

func TestUpdateMeRejectsTooLongValue(t *testing.T) {
	body := `{"fullName":"` + strings.Repeat("あ", 101) + `"}`

	rec := newTestServer(t).do(http.MethodPatch, "/v1/me", uuid.New(), body)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	p := decodeProblem(t, rec)
	if p.Errors == nil || len(*p.Errors) != 1 {
		t.Fatalf("errors = %v, want one field error", p.Errors)
	}
	if e := (*p.Errors)[0]; e.Field != "fullName" || e.Message != "100文字以内で入力してください" {
		t.Errorf("field error = %+v, want fullName with the length message", e)
	}
}

func TestUpdateMeRejectsUnknownField(t *testing.T) {
	rec := newTestServer(t).do(http.MethodPatch, "/v1/me", uuid.New(), `{"xp": 9999}`)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 so that XP cannot be changed directly", rec.Code)
	}
}
