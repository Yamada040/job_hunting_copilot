package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/es"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/interview"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/profile"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

type config struct {
	port        string
	supabaseURL string
	databaseURL string
	developers  []uuid.UUID
}

// loadConfig は、環境変数から設定を読む。必須の値が無ければ、誤った状態で動き出さないようエラーにする。
func loadConfig() (config, error) {
	cfg := config{
		port:        os.Getenv("PORT"),
		supabaseURL: os.Getenv("SUPABASE_URL"),
		databaseURL: os.Getenv("DATABASE_URL"),
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
	return cfg, nil
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
	handler, err := newHandler(verifier, deps{
		db:        db,
		profile:   profile.NewService(profile.NewRepository(db), cfg.developers),
		company:   company.NewService(db, xpService),
		es:        es.NewService(db, xpService),
		interview: interview.NewService(db, xpService),
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
