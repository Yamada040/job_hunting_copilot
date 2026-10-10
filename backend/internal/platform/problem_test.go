package platform

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
)

func writeErrorAndDecode(t *testing.T, err error) (int, openapi.Problem) {
	t.Helper()
	rec := httptest.NewRecorder()
	WriteError(rec, httptest.NewRequest(http.MethodGet, "/v1/things", nil), err)

	if got := rec.Header().Get("Content-Type"); got != "application/problem+json" {
		t.Fatalf("Content-Type = %q, want application/problem+json", got)
	}
	var p openapi.Problem
	if err := json.NewDecoder(rec.Body).Decode(&p); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return rec.Code, p
}

func TestWriteErrorMapsEachKindToStatusAndCode(t *testing.T) {
	cases := []struct {
		kind   Kind
		status int
		code   string
	}{
		{KindInvalid, http.StatusBadRequest, "validation_failed"},
		{KindUnauthorized, http.StatusUnauthorized, "unauthorized"},
		{KindForbidden, http.StatusForbidden, "forbidden"},
		{KindNotFound, http.StatusNotFound, "not_found"},
		{KindConflict, http.StatusConflict, "conflict"},
		{KindRateLimited, http.StatusTooManyRequests, "rate_limited"},
	}
	for _, c := range cases {
		t.Run(c.code, func(t *testing.T) {
			status, p := writeErrorAndDecode(t, &Error{Kind: c.kind, Message: "メッセージ"})

			if status != c.status || p.Status != c.status || p.Code != c.code {
				t.Errorf("got status %d / problem %+v, want %d %s", status, p, c.status, c.code)
			}
			if p.Title != "メッセージ" {
				t.Errorf("title = %q, want the domain message as-is", p.Title)
			}
			if p.Instance == nil || *p.Instance != "/v1/things" {
				t.Errorf("instance = %v, want the request path", p.Instance)
			}
		})
	}
}

func TestWriteErrorIncludesFieldErrors(t *testing.T) {
	_, p := writeErrorAndDecode(t, &Error{
		Kind:    KindInvalid,
		Message: "入力内容に誤りがあります",
		Fields:  []FieldError{{Field: "title", Message: "タイトルは必須です"}},
	})

	if p.Errors == nil || len(*p.Errors) != 1 || (*p.Errors)[0].Field != "title" {
		t.Errorf("errors = %v, want one error for title", p.Errors)
	}
}

func TestWriteErrorFindsWrappedDomainError(t *testing.T) {
	status, p := writeErrorAndDecode(t, fmt.Errorf("load: %w", &Error{Kind: KindNotFound, Message: "見つかりません"}))

	if status != http.StatusNotFound || p.Code != "not_found" {
		t.Errorf("got %d %s, want 404 not_found", status, p.Code)
	}
}

func TestWriteErrorHidesUnexpectedErrorDetails(t *testing.T) {
	status, p := writeErrorAndDecode(t, errors.New("connection refused: secret-host:5432"))

	if status != http.StatusInternalServerError || p.Code != "internal_error" {
		t.Errorf("got %d %s, want 500 internal_error", status, p.Code)
	}
	if p.Title != "サーバーでエラーが発生しました" || p.Detail != nil {
		t.Errorf("problem = %+v, want only the generic message", p)
	}
}
