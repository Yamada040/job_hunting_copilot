package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

type config struct {
	port        string
	supabaseURL string
	databaseURL string
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
	return cfg, nil
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
	handler, err := newHandler(verifier, db)
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
