package main

import (
	"fmt"
	"net/http"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/health"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// server は、機能ごとの handler を埋め込んで、生成された StrictServerInterface をまとめて満たす。
type server struct {
	health.Handler
}

var _ openapi.StrictServerInterface = server{}

func newHandler(verifier *auth.Verifier, db health.Pinger) (http.Handler, error) {
	spec, err := openapi.GetSpec()
	if err != nil {
		return nil, fmt.Errorf("load openapi spec: %w", err)
	}
	// 仕様の servers とリクエストのホスト名を照合させない（プレビュー環境などホスト名が変わるため）
	spec.Servers = nil

	srv := server{
		Handler: health.Handler{DB: db},
	}
	strict := openapi.NewStrictHandlerWithOptions(srv, nil, openapi.StrictHTTPServerOptions{
		RequestErrorHandlerFunc:  writeRequestError,
		ResponseErrorHandlerFunc: platform.WriteError,
	})
	routes := openapi.HandlerWithOptions(strict, openapi.StdHTTPServerOptions{
		BaseRouter:       http.NewServeMux(),
		ErrorHandlerFunc: writeRequestError,
	})

	return platform.Chain(routes,
		platform.RequestID,
		platform.AccessLog,
		platform.Recover,
		verifier.Authenticate,
		platform.Validate(spec, auth.RequireUser),
	), nil
}

func writeRequestError(w http.ResponseWriter, r *http.Request, err error) {
	platform.Logger(r.Context()).Info("invalid request", "error", err)
	platform.WriteError(w, r, &platform.Error{Kind: platform.KindInvalid, Message: "入力内容に誤りがあります"})
}
