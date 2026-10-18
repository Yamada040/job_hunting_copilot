// Package ratelimit は、AIや問い合わせのように費用や負担のかかる操作の回数を、ユーザーごと（またはIPごと・全体）に制限する。
package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// Rule は、1つの制限。Daily が true なら日本時間の1日ごとに、false なら Window ごとに数え直す。
type Rule struct {
	Bucket  string
	Max     int
	Window  time.Duration
	Daily   bool
	Message string
}

// AIの制限（docs/backend-design.md 3章）。短時間の連打の制限と、1日の上限の両方を確かめる
var (
	AIBurst = Rule{Bucket: "ai", Max: 12, Window: time.Minute,
		Message: "AIへのリクエストが多すぎます。1分ほど待ってから再度お試しください。"}
	AIDaily = Rule{Bucket: "ai_daily", Max: 20, Daily: true,
		Message: "AIを使えるのは1日20回までです。明日また使えます。"}
	CompanyAnalysisBurst = Rule{Bucket: "ai_company_analysis", Max: 5, Window: 10 * time.Minute,
		Message: "企業分析のリクエストが多すぎます。しばらく待ってから再度お試しください。"}
	CompanyAnalysisDaily = Rule{Bucket: "ai_company_analysis_daily", Max: 3, Daily: true,
		Message: "企業分析を使えるのは1日3回までです。明日また使えます。"}
)

// 問い合わせの制限。送信用の Gmail のアカウントが1日の送信上限で止められないよう、アプリ全体の上限も設ける
var (
	ContactUserDaily = Rule{Bucket: "contact_daily", Max: 5, Daily: true,
		Message: "お問い合わせを送れるのは1日5通までです。明日また送れます。"}
	ContactIPDaily = Rule{Bucket: "contact_ip_daily", Max: 3, Daily: true,
		Message: "お問い合わせを送れるのは1日3通までです。明日また送れます。"}
	ContactAllDaily = Rule{Bucket: "contact_all_daily", Max: 50, Daily: true,
		Message: "本日はお問い合わせが多く、受付を一時的に止めています。明日以降に再度お試しください。"}
)

var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

type Limiter struct {
	now func() time.Time
}

func NewLimiter() *Limiter {
	return &Limiter{now: time.Now}
}

// Hit は、rules のそれぞれについて userID の回数を1つ数え、どれかが上限を超えていれば 429 のエラーを返す。
// 上限を超えたリクエストも1回として数える（連打を続けると待ち時間が延びるのではなく、期間が切り替わるまで拒否され続ける）。
func (l *Limiter) Hit(ctx context.Context, q *db.Queries, userID uuid.UUID, rules ...Rule) error {
	return l.hit(rules, func(r Rule, now, start time.Time) (int32, error) {
		return q.HitRateLimit(ctx, db.HitRateLimitParams{UserID: userID, Bucket: r.Bucket, Now: now, WindowStart: start})
	})
}

// HitByKey は、Hit と同じことを、ユーザーではない key（ログインしていない人のIPのハッシュや、アプリ全体）ごとに行う。
func (l *Limiter) HitByKey(ctx context.Context, q *db.Queries, key string, rules ...Rule) error {
	return l.hit(rules, func(r Rule, now, start time.Time) (int32, error) {
		return q.HitRateLimitByKey(ctx, db.HitRateLimitByKeyParams{Key: key, Bucket: r.Bucket, Now: now, WindowStart: start})
	})
}

func (l *Limiter) hit(rules []Rule, count func(r Rule, now, start time.Time) (int32, error)) error {
	now := l.now()
	for _, r := range rules {
		start := now.Add(-r.Window)
		if r.Daily {
			t := now.In(jst)
			start = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, jst)
		}
		n, err := count(r, now, start)
		if err != nil {
			return fmt.Errorf("hit rate limit %s: %w", r.Bucket, err)
		}
		if int(n) > r.Max {
			return &platform.Error{Kind: platform.KindRateLimited, Message: r.Message}
		}
	}
	return nil
}
