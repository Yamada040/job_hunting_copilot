package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/admin"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/assessment"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/calendar"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/contact"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/es"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/interview"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/profile"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/webtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

type config struct {
	port        string
	supabaseURL string
	databaseURL string
	developers  []uuid.UUID
	ai          ai.Config
	aiAppLimits ratelimit.AppLimits
	smtp        contact.SMTPConfig
}

// loadConfig は、環境変数から設定を読む。必須の値が無ければ、誤った状態で動き出さないようエラーにする。
func loadConfig() (config, error) {
	cfg := config{
		port:        os.Getenv("PORT"),
		supabaseURL: os.Getenv("SUPABASE_URL"),
		databaseURL: os.Getenv("DATABASE_URL"),
		// AIのキーは任意。無ければAI機能だけが 503 を返し、他の機能は動く（docs/backend-design.md 6章）
		ai: ai.Config{
			Provider:         os.Getenv("AI_PROVIDER"),
			APIKey:           os.Getenv("AI_PROVIDER_API_KEY"),
			Model:            os.Getenv("AI_MODEL"),
			GPTEndpoint:      os.Getenv("AI_ENDPOINT"),
			GeminiAPIVersion: os.Getenv("AI_API_VERSION"),
			TavilyAPIKey:     os.Getenv("TAVILY_API_KEY"),
		},
		// SMTPの設定も任意。無ければ問い合わせだけが 503 を返す
		smtp: contact.SMTPConfig{
			Host: os.Getenv("SMTP_HOST"),
			Port: os.Getenv("SMTP_PORT"),
			User: os.Getenv("SMTP_USER"),
			Pass: os.Getenv("SMTP_PASS"),
			To:   os.Getenv("CONTACT_TO_EMAIL"),
		},
	}
	if cfg.port == "" {
		cfg.port = "8080"
	}
	if cfg.supabaseURL == "" {
		return config{}, errors.New("SUPABASE_URL is required")
	}
	if cfg.databaseURL == "" {
		return config{}, errors.New("DATABASE_URL is required")
	}
	developers, err := parseUserIDs(os.Getenv("DEV_ADMIN_USER_IDS"))
	if err != nil {
		return config{}, fmt.Errorf("DEV_ADMIN_USER_IDS: %w", err)
	}
	cfg.developers = developers
	cfg.aiAppLimits = ratelimit.DefaultAppLimits
	if cfg.aiAppLimits.AIDaily, err = parseLimit("AI_APP_DAILY_LIMIT", cfg.aiAppLimits.AIDaily); err != nil {
		return config{}, err
	}
	if cfg.aiAppLimits.CompanyAnalysisDaily, err = parseLimit("COMPANY_ANALYSIS_APP_DAILY_LIMIT", cfg.aiAppLimits.CompanyAnalysisDaily); err != nil {
		return config{}, err
	}
	return cfg, nil
}

// parseLimit は、環境変数 name の上限を読む。空なら fallback を使う。
func parseLimit(name string, fallback int) (int, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return 0, fmt.Errorf("%s must be a non-negative integer: %q", name, raw)
	}
	return n, nil
}

// parseUserIDs は、カンマ区切りのユーザーIDを読む。空なら開発者はいない。
func parseUserIDs(raw string) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	for part := range strings.SplitSeq(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		id, err := uuid.Parse(part)
		if err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if err := run(); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	ctx := context.Background()
	verifier, err := auth.NewVerifier(ctx, cfg.supabaseURL)
	if err != nil {
		return err
	}
	db, err := platform.OpenDB(ctx, cfg.databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()
	xpService := xp.NewService()
	// 企業分析はWeb検索を挟んで数十秒かかるため、1回の呼び出しの上限は長めにとる（Vercelの関数の上限300秒以内）
	aiClient := ai.NewClient(cfg.ai, &http.Client{Timeout: 90 * time.Second})
	limiter := ratelimit.NewLimiter(cfg.aiAppLimits)
	profiles := profile.NewService(profile.NewRepository(db), cfg.developers)
	handler, err := newHandler(verifier, deps{
		db:        db,
		profile:   profiles,
		company:   company.NewService(db, xpService, aiClient, limiter),
		es:        es.NewService(db, xpService, aiClient, limiter),
		interview: interview.NewService(db, xpService, aiClient, limiter),
		calendar:  calendar.NewService(db),
		xpLogs:    xp.Handler{Pool: db},
		assessment: assessment.Handler{
			Aptitude:     assessment.NewAptitudeService(db, xpService, aiClient, limiter),
			SelfAnalysis: assessment.NewSelfAnalysisService(db, xpService, aiClient, limiter),
		},
		webtest: webtest.NewService(db, xpService),
		contact: contact.Handler{Pool: db, Config: cfg.smtp, Send: contact.SendSMTP, Limiter: limiter},
		admin:   admin.Handler{Pool: db, IsDeveloper: profiles.IsDeveloper, Now: time.Now},
	})
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              ":" + cfg.port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}
	slog.Info("listening", "port", cfg.port)
	return srv.ListenAndServe()
}
