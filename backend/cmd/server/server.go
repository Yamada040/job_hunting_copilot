package main

import (
	"fmt"
	"net/http"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/health"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/profile"
)

// 機能ごとの handler はどれも Handler という名前なので、別名を付けて埋め込む（同じ名前のフィールドを2つ埋め込めないため）
type (
	healthHandler  = health.Handler
	profileHandler = profile.Handler
	companyHandler = company.Handler
)

// server は、機能ごとの handler を埋め込んで、生成された StrictServerInterface をまとめて満たす。
type server struct {
	healthHandler
	profileHandler
	companyHandler
}

// deps は、handler が使う依存。main で組み立て、テストでは偽物に差し替える。
type deps struct {
	db      health.Pinger
	profile *profile.Service
	company *company.Service
}

var _ openapi.StrictServerInterface = server{}

func newHandler(verifier *auth.Verifier, d deps) (http.Handler, error) {
	spec, err := openapi.GetSpec()
	if err != nil {
		return nil, fmt.Errorf("load openapi spec: %w", err)
	}
	// 仕様の servers とリクエストのホスト名を照合させない（プレビュー環境などホスト名が変わるため）
	spec.Servers = nil

	srv := server{
		healthHandler:  health.Handler{DB: d.db},
		profileHandler: profile.Handler{Service: d.profile},
		companyHandler: company.Handler{Service: d.company},
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
