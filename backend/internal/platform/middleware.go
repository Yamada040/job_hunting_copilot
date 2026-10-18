package platform

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"runtime/debug"
	"time"
)

// Middleware は、http.Handler を包んで前後に処理を足す関数。
type Middleware func(http.Handler) http.Handler

// Chain は、先頭のものが一番外側になるように middlewares で h を包む。
func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

type requestIDKey struct{}

const requestIDHeader = "X-Request-Id"

// RequestID は、リクエストごとのIDを決めてコンテキストとレスポンスヘッダーに入れる。
// 呼び出し元がIDを付けてきた場合はそれを引き継ぎ、ログを突き合わせられるようにする。
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(requestIDHeader)
		if id == "" {
			id = newRequestID()
		}
		w.Header().Set(requestIDHeader, id)
		ctx := context.WithValue(r.Context(), requestIDKey{}, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func newRequestID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b) // crypto/rand.Read は Go 1.24 以降エラーを返さない
	return hex.EncodeToString(b)
}

// Logger は、リクエストIDを付けたロガーを返す。
func Logger(ctx context.Context) *slog.Logger {
	if id, ok := ctx.Value(requestIDKey{}).(string); ok {
		return slog.Default().With("request_id", id)
	}
	return slog.Default()
}

type clientIPKey struct{}

// ClientIP は、リクエストを送ってきた端末のIPアドレスをコンテキストに入れる。
// Vercel は X-Real-IP を接続元のIPで上書きするので、利用者が偽れない。X-Forwarded-For は、手元の next dev の転送などでは
// 利用者が付けた値がそのまま残るので見ない。ヘッダーが無ければ（手元で直接呼んだとき）接続元のアドレスを使う。
func ClientIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.Header.Get("X-Real-IP")
		if ip == "" {
			ip = r.RemoteAddr
			if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
				ip = host
			}
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), clientIPKey{}, ip)))
	})
}

// ClientIPFrom は、ClientIP が入れたIPアドレスを返す。無ければ空文字。
func ClientIPFrom(ctx context.Context) string {
	ip, _ := ctx.Value(clientIPKey{}).(string)
	return ip
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(status int) {
	s.status = status
	s.ResponseWriter.WriteHeader(status)
}

// AccessLog は、リクエストごとにメソッド・パス・ステータス・所要時間を1行ログに出す。
func AccessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		Logger(r.Context()).Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

// Recover は、panic を 500 のエラーレスポンスに変え、サーバーを止めずに処理を続ける。
// RequestID と AccessLog より内側に置き、panic のログにもリクエストIDと結果のステータスが残るようにする。
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				if v == http.ErrAbortHandler {
					panic(v)
				}
				WriteError(w, r, fmt.Errorf("panic: %v\n%s", v, debug.Stack()))
			}
		}()
		next.ServeHTTP(w, r)
	})
}
