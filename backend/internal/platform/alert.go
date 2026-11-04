package platform

import (
	"context"
	"net/http"
)

// Alert は、運営がすぐに知るべき出来事（攻撃や障害の疑い）の種類。
// 起きるたびに Notify で数え、1時間に Threshold 回を超えた最初の回だけ Warn のログで知らせる（Warn 以上は Slack に届く）。
// 起きるたびに知らせないのは、攻撃が続くと通知が埋まるため。1日に1回にしないのは、続いていることに気づけるようにするため
type Alert struct {
	// Name は、数える枠の名前。Slack には bucket として出るので、個人に結び付く値を入れない
	Name    string
	Message string
	// Threshold は、普段でも起きうる回数。0 なら1回目から知らせる
	Threshold int
}

// Alerter は、Alert の回数を数えて、知らせるかを決める。数えるのにDBを使うので、実装は ratelimit が持つ。
type Alerter interface {
	Notify(ctx context.Context, a Alert)
}

type alerterKey struct{}

// WithAlerter は、Notify が a を使えるようにしたコンテキストを返す。
func WithAlerter(ctx context.Context, a Alerter) context.Context {
	return context.WithValue(ctx, alerterKey{}, a)
}

// Alerts は、リクエストの中で Notify を使えるようにする。認証より外側に置き、不正なトークンも数えられるようにする。
func Alerts(a Alerter) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(WithAlerter(r.Context(), a)))
		})
	}
}

// Notify は、a が1回起きたことを数える。Alerts を通っていないコンテキストでは何もしない。
func Notify(ctx context.Context, a Alert) {
	if alerter, ok := ctx.Value(alerterKey{}).(Alerter); ok {
		alerter.Notify(ctx, a)
	}
}
