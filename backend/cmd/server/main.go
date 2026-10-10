package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
)

type config struct {
	port        string
	supabaseURL string
}

// loadConfig は、環境変数から設定を読む。必須の値が無ければ、誤った状態で動き出さないようエラーにする。
func loadConfig() (config, error) {
	cfg := config{
		port:        os.Getenv("PORT"),
		supabaseURL: os.Getenv("SUPABASE_URL"),
	}
	if cfg.port == "" {
		cfg.port = "8080"
	}
	if cfg.supabaseURL == "" {
		return config{}, errors.New("SUPABASE_URL is required")
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
	verifier, err := auth.NewVerifier(context.Background(), cfg.supabaseURL)
	if err != nil {
		return err
	}
	handler, err := newHandler(verifier)
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
