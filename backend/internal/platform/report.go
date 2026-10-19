package platform

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"time"
)

// UnexpectedError は、外部に知らせる想定外のエラー。調べるのに要る値だけを持ち、
// リクエストの本文・クエリ・ヘッダーやユーザーIDなど、利用者の入力や個人に結び付く値は持たせない。
type UnexpectedError struct {
	// Message は、エラーの文言とスタックトレース（debug.Stack の形）。
	Message string
	Method  string
	// Path は、秘密の値を伏せたパス（クエリは含めない）。
	Path string
}

// ErrorReporter は、想定外のエラーを外部のサービスに送る。
type ErrorReporter interface {
	Report(ctx context.Context, e UnexpectedError) error
}

type errorReporterKey struct{}

// reportTimeout は、送信を待つ上限。送り終えてから応答を書くので、利用者の待ち時間がこの分だけ延びうる。
const reportTimeout = 2 * time.Second

// ReportErrors は、WriteError が想定外のエラーを reporter に送れるようにする。reporter が nil なら何もしない。
// panic の回復（Recover）も WriteError を通るので、Recover より外側に置く。
func ReportErrors(reporter ErrorReporter) Middleware {
	return func(next http.Handler) http.Handler {
		if reporter == nil {
			return next
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), errorReporterKey{}, reporter)))
		})
	}
}

// reportUnexpected は、応答を書く前に想定外のエラーを送る。失敗してもログに出すだけで、利用者への応答は変えない。
// 応答を書いてから裏で送らないのは、Vercel の関数は応答を返すと止められうるうえ、Go には Node.js の waitUntil に当たる
// 「応答の後も処理を続けさせる」仕組みが無く、送信が途中で切れてエラーに気づけなくなるため。
func reportUnexpected(r *http.Request, err error) {
	reporter, ok := r.Context().Value(errorReporterKey{}).(ErrorReporter)
	if !ok {
		return
	}
	message := err.Error()
	var p *panicError
	if !errors.As(err, &p) {
		// panic でなければ、ここまでの呼び出し元をスタックトレースとして付ける。Error Reporting はスタックトレースで
		// エラーをまとめるので、どのAPIで起きたか（生成された handler の関数）で分かれる
		message += "\n\n" + string(debug.Stack())
	}
	// 利用者が通信を切ってもエラーは送りたいので、リクエストの取り消しは引き継がない
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), reportTimeout)
	defer cancel()
	if reportErr := reporter.Report(ctx, UnexpectedError{Message: message, Method: r.Method, Path: maskPath(r.URL.Path)}); reportErr != nil {
		Logger(r.Context()).Error("failed to report error", "error", reportErr)
	}
}

// panicError は、Recover が受け取った panic。発生した場所のスタックトレースを持つ。
type panicError struct {
	value any
	stack []byte
}

func (e *panicError) Error() string {
	return fmt.Sprintf("panic: %v\n\n%s", e.value, e.stack)
}
