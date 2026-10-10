package platform

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	middleware "github.com/oapi-codegen/nethttp-middleware"
)

// Validate は、リクエストを OpenAPI の仕様と照らし合わせ、仕様に合わないものを handler に届く前に弾く。
func Validate(spec *openapi3.T) Middleware {
	return middleware.OapiRequestValidatorWithOptions(spec, &middleware.Options{
		Options: openapi3filter.Options{
			// 認証は JWT を検証するミドルウェアが受け持つので、ここでは仕様上の security を見ない
			AuthenticationFunc: openapi3filter.NoopAuthenticationFunc,
		},
		ErrorHandlerWithOpts: writeValidationError,
	})
}

func writeValidationError(_ context.Context, err error, w http.ResponseWriter, r *http.Request, opts middleware.ErrorHandlerOpts) {
	switch {
	case errors.Is(err, routers.ErrMethodNotAllowed):
		writeProblem(w, r, http.StatusMethodNotAllowed, "method_not_allowed", "このAPIはそのメソッドに対応していません", nil)
	case opts.StatusCode == http.StatusNotFound:
		WriteError(w, r, &Error{Kind: KindNotFound, Message: "指定されたAPIは存在しません"})
	case opts.StatusCode == http.StatusBadRequest:
		WriteError(w, r, &Error{
			Kind:    KindInvalid,
			Message: "入力内容に誤りがあります",
			Fields:  fieldErrors(err),
		})
	default:
		WriteError(w, r, err)
	}
}

func fieldErrors(err error) []FieldError {
	var reqErr *openapi3filter.RequestError
	if !errors.As(err, &reqErr) {
		return nil
	}

	field := ""
	switch {
	case reqErr.Parameter != nil:
		field = reqErr.Parameter.Name
	default:
		var schemaErr *openapi3.SchemaError
		if errors.As(reqErr.Err, &schemaErr) {
			field = strings.Join(schemaErr.JSONPointer(), ".")
		}
	}
	if field == "" {
		return nil
	}
	return []FieldError{{Field: field, Message: "値が正しくありません"}}
}
