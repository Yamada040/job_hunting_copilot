// Package ratelimit は、AIのように費用のかかる操作の回数を、ユーザーごとに制限する。
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

var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

type Limiter struct {
	now func() time.Time
}

func NewLimiter() *Limiter {
	return &Limiter{now: time.Now}
}

// Hit は、rules のそれぞれについて回数を1つ数え、どれかが上限を超えていれば 429 のエラーを返す。
// 上限を超えたリクエストも1回として数える（連打を続けると待ち時間が延びるのではなく、期間が切り替わるまで拒否され続ける）。
func (l *Limiter) Hit(ctx context.Context, q *db.Queries, userID uuid.UUID, rules ...Rule) error {
	now := l.now()
	for _, r := range rules {
		start := now.Add(-r.Window)
		if r.Daily {
			t := now.In(jst)
			start = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, jst)
		}
		count, err := q.HitRateLimit(ctx, db.HitRateLimitParams{UserID: userID, Bucket: r.Bucket, Now: now, WindowStart: start})
		if err != nil {
			return fmt.Errorf("hit rate limit %s: %w", r.Bucket, err)
		}
		if int(count) > r.Max {
			return &platform.Error{Kind: platform.KindRateLimited, Message: r.Message}
		}
	}
	return nil
}
