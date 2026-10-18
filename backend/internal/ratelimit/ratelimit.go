// Package ratelimit は、AIや問い合わせのように費用や負担のかかる操作の回数を、ユーザーごとと、アプリ全体で制限する。
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
// AppWide が true なら、ユーザーごとではなく Bucket ごとに全員で1つの枠を数える（アプリ全体の枠や、IPごとの枠）。
type Rule struct {
	Bucket  string
	Max     int
	Window  time.Duration
	Daily   bool
	AppWide bool
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
	ContactAppDaily = Rule{Bucket: "contact_daily", Max: 50, Daily: true, AppWide: true,
		Message: "本日はお問い合わせが多く、受付を一時的に止めています。明日以降に再度お試しください。"}
)

// ContactIPDaily は、ログインしていない人の問い合わせの、IPごとの1日の上限。ipHash ごとに別の枠を
// アプリ全体の枠と同じ表で数える（ユーザーに属さない枠なので）。ContactAppDaily の枠と名前がぶつからないよう接頭辞を付ける
func ContactIPDaily(ipHash string) Rule {
	return Rule{Bucket: "contact_daily:ip:" + ipHash, Max: 3, Daily: true, AppWide: true,
		Message: "お問い合わせを送れるのは1日3通までです。明日また送れます。"}
}

// AppLimits は、アプリ全体の1日の上限。外部のAPIの無料枠に合わせて変えられるよう、環境変数から読む（cmd/server）。
type AppLimits struct {
	AIDaily              int
	CompanyAnalysisDaily int
}

// DefaultAppLimits は、環境変数が無いときの上限。
// 企業分析は1回で最大3回検索するので、Tavily の無料枠（月1,000回）に収まるよう 10回 × 3回 × 31日 = 930回 に抑える
var DefaultAppLimits = AppLimits{AIDaily: 300, CompanyAnalysisDaily: 10}

var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

type Limiter struct {
	now                     func() time.Time
	aiAppDaily              Rule
	companyAnalysisAppDaily Rule
}

func NewLimiter(app AppLimits) *Limiter {
	return &Limiter{
		now: time.Now,
		aiAppDaily: Rule{Bucket: "ai_daily", Max: app.AIDaily, Daily: true, AppWide: true,
			Message: "今日はAIの利用がアプリ全体の上限に達したため、AI機能を使えません。明日また使えます。"},
		companyAnalysisAppDaily: Rule{Bucket: "ai_company_analysis_daily", Max: app.CompanyAnalysisDaily, Daily: true, AppWide: true,
			Message: "今日は企業分析の利用がアプリ全体の上限に達したため、企業分析を使えません。明日また使えます。"},
	}
}

// HitAI は、汎用のAI（添削・振り返り・診断・自己分析）の1回を数える。
// アプリ全体の枠を最後に数えるのは、1人の連打が本人の上限で止まり、全員の枠を減らさないようにするため。
func (l *Limiter) HitAI(ctx context.Context, q *db.Queries, userID uuid.UUID) error {
	return l.Hit(ctx, q, userID, AIBurst, AIDaily, l.aiAppDaily)
}

// HitCompanyAnalysis は、AI企業分析の1回を数える。順番の理由は HitAI と同じ。
func (l *Limiter) HitCompanyAnalysis(ctx context.Context, q *db.Queries, userID uuid.UUID) error {
	return l.Hit(ctx, q, userID, CompanyAnalysisBurst, CompanyAnalysisDaily, l.companyAnalysisAppDaily)
}

// Hit は、rules を順に1つずつ数え、上限を超えたものがあればそこで止めて 429 のエラーを返す。
// 上限を超えたリクエストも1回として数える（連打を続けると待ち時間が延びるのではなく、期間が切り替わるまで拒否され続ける）。
func (l *Limiter) Hit(ctx context.Context, q *db.Queries, userID uuid.UUID, rules ...Rule) error {
	now := l.now()
	for _, r := range rules {
		start := now.Add(-r.Window)
		if r.Daily {
			t := now.In(jst)
			start = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, jst)
		}
		var count int32
		var err error
		if r.AppWide {
			count, err = q.HitAppRateLimit(ctx, db.HitAppRateLimitParams{Bucket: r.Bucket, Now: now, WindowStart: start})
		} else {
			count, err = q.HitRateLimit(ctx, db.HitRateLimitParams{UserID: userID, Bucket: r.Bucket, Now: now, WindowStart: start})
		}
		if err != nil {
			return fmt.Errorf("hit rate limit %s: %w", r.Bucket, err)
		}
		if int(count) > r.Max {
			return &platform.Error{Kind: platform.KindRateLimited, Message: r.Message}
		}
	}
	return nil
}
