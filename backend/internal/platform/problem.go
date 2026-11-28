package platform

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
)

type problemKind struct {
	status int
	code   string
}

var problemKinds = map[Kind]problemKind{
	KindInvalid:      {http.StatusBadRequest, "validation_failed"},
	KindUnauthorized: {http.StatusUnauthorized, "unauthorized"},
	KindForbidden:    {http.StatusForbidden, "forbidden"},
	KindNotFound:     {http.StatusNotFound, "not_found"},
	KindConflict:     {http.StatusConflict, "conflict"},
	KindRateLimited:  {http.StatusTooManyRequests, "rate_limited"},
	KindUnavailable:  {http.StatusServiceUnavailable, "unavailable"},
}

// WriteError は、エラーを RFC 9457 の Problem Details として書き出す。エラーからHTTPのレスポンスへの変換はすべてここを通す。
// 想定外のエラーは、利用者には詳細を見せずにログに残し、ReportErrors で設定した外部のサービスにも送る。
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	var appErr *Error
	if errors.As(err, &appErr) {
		if kind, ok := problemKinds[appErr.Kind]; ok {
			code := kind.code
			if appErr.Code != "" {
				code = appErr.Code
			}
			if appErr.RetryAfter > 0 {
				// 端数は切り上げる。早すぎる再試行で、また断られるのを避けるため
				w.Header().Set("Retry-After", strconv.Itoa(int((appErr.RetryAfter+time.Second-1)/time.Second)))
			}
			writeProblem(w, r, kind.status, code, appErr.Message, appErr.Fields)
			return
		}
	}

	Logger(r.Context()).Error("unexpected error", "error", err)
	reportUnexpected(r, err)
	writeProblem(w, r, http.StatusInternalServerError, "internal_error", "サーバーでエラーが発生しました", nil)
}

func writeProblem(w http.ResponseWriter, r *http.Request, status int, code, title string, fields []FieldError) {
	instance := r.URL.Path
	problem := openapi.Problem{
		Type:     "about:blank",
		Title:    title,
		Status:   status,
		Code:     code,
		Instance: &instance,
	}
	if len(fields) > 0 {
		items := make([]openapi.FieldError, len(fields))
		for i, f := range fields {
			items[i] = openapi.FieldError{Field: f.Field, Message: f.Message}
		}
		problem.Errors = &items
	}

	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(problem); err != nil {
		Logger(r.Context()).Error("failed to write problem response", "error", err)
	}
}
