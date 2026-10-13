package main

import (
	"fmt"
	"net/http"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/admin"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/assessment"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/calendar"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/contact"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/es"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/health"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/interview"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/profile"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/webtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

// 機能ごとの handler はどれも Handler という名前なので、別名を付けて埋め込む（同じ名前のフィールドを2つ埋め込めないため）
type (
	healthHandler     = health.Handler
	profileHandler    = profile.Handler
	companyHandler    = company.Handler
	esHandler         = es.Handler
	interviewHandler  = interview.Handler
	calendarHandler   = calendar.Handler
	xpHandler         = xp.Handler
	assessmentHandler = assessment.Handler
	webtestHandler    = webtest.Handler
	contactHandler    = contact.Handler
	adminHandler      = admin.Handler
)

// server は、機能ごとの handler を埋め込んで、生成された StrictServerInterface をまとめて満たす。
type server struct {
	healthHandler
	profileHandler
	companyHandler
	esHandler
	interviewHandler
	calendarHandler
	xpHandler
	assessmentHandler
	webtestHandler
	contactHandler
	adminHandler
}

// deps は、handler が使う依存。main で組み立て、テストでは偽物に差し替える。
type deps struct {
	db         health.Pinger
	profile    *profile.Service
	company    *company.Service
	es         *es.Service
	interview  *interview.Service
	calendar   *calendar.Service
	xpLogs     xp.Handler
	assessment assessment.Handler
	webtest    *webtest.Service
	contact    contact.Handler
	admin      admin.Handler
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
		healthHandler:     health.Handler{DB: d.db},
		profileHandler:    profile.Handler{Service: d.profile},
		companyHandler:    company.Handler{Service: d.company},
		esHandler:         es.Handler{Service: d.es},
		interviewHandler:  interview.Handler{Service: d.interview},
		calendarHandler:   calendar.Handler{Service: d.calendar},
		xpHandler:         d.xpLogs,
		assessmentHandler: d.assessment,
		webtestHandler:    webtest.Handler{Service: d.webtest},
		contactHandler:    d.contact,
		adminHandler:      d.admin,
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
