package platform

import (
	"encoding/json"
	"errors"
	"net/http"

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
}

// WriteError は、エラーを RFC 9457 の Problem Details として書き出す。エラーからHTTPのレスポンスへの変換はすべてここを通す。
// 想定外のエラーは、利用者には詳細を見せずにログにだけ残す。
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	var appErr *Error
	if errors.As(err, &appErr) {
		if kind, ok := problemKinds[appErr.Kind]; ok {
			writeProblem(w, r, kind.status, kind.code, appErr.Message, appErr.Fields)
			return
		}
	}

	Logger(r.Context()).Error("unexpected error", "error", err)
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
