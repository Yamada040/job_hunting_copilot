package platform

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	middleware "github.com/oapi-codegen/nethttp-middleware"
)

// Validate は、リクエストを OpenAPI の仕様と照らし合わせ、仕様に合わないものを handler に届く前に弾く。
// 仕様で security が付いた操作では authenticate を呼び、ログインが必要なAPIかどうかの判断を仕様に一本化する。
func Validate(spec *openapi3.T, authenticate openapi3filter.AuthenticationFunc) Middleware {
	return middleware.OapiRequestValidatorWithOptions(spec, &middleware.Options{
		Options: openapi3filter.Options{
			AuthenticationFunc: authenticate,
		},
		ErrorHandlerWithOpts: writeValidationError,
	})
}

func writeValidationError(_ context.Context, err error, w http.ResponseWriter, r *http.Request, opts middleware.ErrorHandlerOpts) {
	switch {
	case errors.Is(err, routers.ErrMethodNotAllowed):
		writeProblem(w, r, http.StatusMethodNotAllowed, "method_not_allowed", "このAPIはそのメソッドに対応していません", nil)
	case opts.StatusCode == http.StatusUnauthorized:
		WriteError(w, r, &Error{Kind: KindUnauthorized, Message: "ログインが必要です"})
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

	var schemaErr *openapi3.SchemaError
	hasSchemaErr := errors.As(reqErr.Err, &schemaErr)

	field := ""
	switch {
	case reqErr.Parameter != nil:
		field = reqErr.Parameter.Name
	case hasSchemaErr:
		field = strings.Join(schemaErr.JSONPointer(), ".")
	}
	if field == "" {
		return nil
	}
	message := "値が正しくありません"
	if hasSchemaErr {
		message = schemaMessage(schemaErr)
	}
	return []FieldError{{Field: field, Message: message}}
}

// schemaMessage は、仕様のどの制約に違反したかに応じて、利用者向けの日本語のメッセージを返す。
func schemaMessage(e *openapi3.SchemaError) string {
	switch e.SchemaField {
	case "maxLength":
		if e.Schema != nil && e.Schema.MaxLength != nil {
			return fmt.Sprintf("%d文字以内で入力してください", *e.Schema.MaxLength)
		}
	case "minLength":
		return "入力してください"
	case "required":
		return "必須の項目です"
	case "additionalProperties":
		return "この項目は指定できません"
	}
	return "値が正しくありません"
}
