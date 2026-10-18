// Package ratelimit は、AIや問い合わせのように費用や負担のかかる操作の回数を、ユーザーごとと、アプリ全体で制限する。
// AIは、アプリ全体の1日の利用料（金額）でも制限する。
package ratelimit

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
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

// AppLimits は、アプリ全体の1日の上限。外部のAPIの無料枠や料金に合わせて変えられるよう、環境変数から読む（cmd/server）。
type AppLimits struct {
	AIDaily              int
	CompanyAnalysisDaily int
	// AIDailyBudget は、AIの利用料のアプリ全体の1日の上限（ドル）。回数の上限だけでは、長い入力で何度も呼ばれたときの費用を抑えられないため
	AIDailyBudget float64
	AIPrices      Prices
}

// Prices は、AIの100万トークンあたりの料金（ドル）。Gemini の思考のトークンは出力の料金がかかる（ai.Usage の OutputTokens に含む）。
type Prices struct {
	Input  float64
	Output float64
}

// microdollars は、usage の料金をマイクロドル（100万分の1ドル）で返す。
// 100万トークンあたりのドルは、1トークンあたりのマイクロドルと同じ値になる。上限を甘くしないよう端数は切り上げる
func (p Prices) microdollars(usage ai.Usage) int {
	return int(math.Ceil(float64(usage.InputTokens)*p.Input + float64(usage.OutputTokens)*p.Output))
}

// DefaultAppLimits は、環境変数が無いときの上限。
// 企業分析は1回で最大3回検索するので、Tavily の無料枠（月1,000回）に収まるよう 10回 × 3回 × 31日 = 930回 に抑える。
// 料金は本番の gemini-2.5-flash のもの
var DefaultAppLimits = AppLimits{AIDaily: 300, CompanyAnalysisDaily: 10, AIDailyBudget: 1, AIPrices: Prices{Input: 0.30, Output: 2.50}}

var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

type Limiter struct {
	now                     func() time.Time
	aiAppDaily              Rule
	companyAnalysisAppDaily Rule
	// aiCostDaily は、AIの利用料の枠。Max はマイクロドル
	aiCostDaily Rule
	aiPrices    Prices
}

const aiAppLimitMessage = "今日はAIの利用がアプリ全体の上限に達したため、AI機能を使えません。明日また使えます。"

func NewLimiter(app AppLimits) *Limiter {
	return &Limiter{
		now: time.Now,
		aiAppDaily: Rule{Bucket: "ai_daily", Max: app.AIDaily, Daily: true, AppWide: true,
			Message: aiAppLimitMessage},
		companyAnalysisAppDaily: Rule{Bucket: "ai_company_analysis_daily", Max: app.CompanyAnalysisDaily, Daily: true, AppWide: true,
			Message: "今日は企業分析の利用がアプリ全体の上限に達したため、企業分析を使えません。明日また使えます。"},
		aiCostDaily: Rule{Bucket: "ai_cost_microdollars_daily", Max: int(math.Round(app.AIDailyBudget * 1e6)), Daily: true, AppWide: true,
			Message: aiAppLimitMessage},
		aiPrices: app.AIPrices,
	}
}

// Charge は、HitAI・HitCompanyAnalysis で数えた1回。AIの呼び出しが失敗したら Refund で戻す。
type Charge struct {
	userID uuid.UUID
	at     time.Time
	rules  []Rule
}

// HitAI は、汎用のAI（添削・振り返り・診断・自己分析）の1回を数える。
// 利用料の上限を先に確かめるのは、アプリ全体で止まっているときに、本人の1日の回数まで減らさないため。
// アプリ全体の回数の枠を最後に数えるのは、1人の連打が本人の上限で止まり、全員の枠を減らさないようにするため。
func (l *Limiter) HitAI(ctx context.Context, q *db.Queries, userID uuid.UUID) (Charge, error) {
	if err := l.checkAICost(ctx, q); err != nil {
		return Charge{}, err
	}
	return l.charge(ctx, q, userID, AIBurst, AIDaily, l.aiAppDaily)
}

// HitCompanyAnalysis は、AI企業分析の1回を数える。順番の理由は HitAI と同じ。
func (l *Limiter) HitCompanyAnalysis(ctx context.Context, q *db.Queries, userID uuid.UUID) (Charge, error) {
	if err := l.checkAICost(ctx, q); err != nil {
		return Charge{}, err
	}
	return l.charge(ctx, q, userID, CompanyAnalysisBurst, CompanyAnalysisDaily, l.companyAnalysisAppDaily)
}

func (l *Limiter) charge(ctx context.Context, q *db.Queries, userID uuid.UUID, rules ...Rule) (Charge, error) {
	now := l.now()
	if err := hit(ctx, q, userID, now, rules); err != nil {
		return Charge{}, err
	}
	return Charge{userID: userID, at: now, rules: rules}, nil
}

// Refund は、AIの呼び出しが失敗した1回を、1日の枠（本人とアプリ全体）から戻す。利用料は、かかった分なので戻さない。
// 短時間の連打の枠を戻さないのは、AIの障害中に再試行が続いても、外部のAPIを叩き続けないようにするため。
// 戻せなくても、元の失敗を利用者に返すのを優先してログにだけ出す。
func (c Charge) Refund(ctx context.Context, q *db.Queries) {
	// 利用者が待たずに画面を離れ、リクエストが取り消されていても戻す
	ctx = context.WithoutCancel(ctx)
	for _, r := range c.rules {
		if !r.Daily {
			continue
		}
		var err error
		if r.AppWide {
			err = q.RefundAppRateLimit(ctx, db.RefundAppRateLimitParams{Bucket: r.Bucket, HitAt: c.at})
		} else {
			err = q.RefundRateLimit(ctx, db.RefundRateLimitParams{UserID: c.userID, Bucket: r.Bucket, HitAt: c.at})
		}
		if err != nil {
			platform.Logger(ctx).Error("refund rate limit", "bucket", r.Bucket, "error", err)
		}
	}
}

// checkAICost は、今日のAIの利用料がアプリ全体の上限に達していれば 429 のエラーを返す。
// 呼ぶ前に予約せず、呼んだ後に実際の料金を足す（AddAICost）ので、同時に呼ばれた分だけ上限を少し超えうる。
// 予約しないのは、料金は応答のトークン数が分かるまで決まらず、多めに見積もって予約すると上限の近くで必要以上に断ってしまうため。
// 超えるのは同時に処理中の数件分（1件あたり多くて数セント）にとどまり、上限の目的（費用の暴走を止める）には十分
func (l *Limiter) checkAICost(ctx context.Context, q *db.Queries) error {
	r := l.aiCostDaily
	spent, err := q.GetAppRateLimit(ctx, db.GetAppRateLimitParams{Bucket: r.Bucket, WindowStart: windowStart(r, l.now())})
	if err != nil {
		return fmt.Errorf("get ai cost: %w", err)
	}
	if int(spent) >= r.Max {
		return &platform.Error{Kind: platform.KindRateLimited, Message: r.Message}
	}
	return nil
}

// AddAICost は、AIの呼び出しで使ったトークン数の料金を、今日のアプリ全体の利用料に足す。
func (l *Limiter) AddAICost(ctx context.Context, q *db.Queries, usage ai.Usage) error {
	cost := l.aiPrices.microdollars(usage)
	if cost <= 0 {
		return nil
	}
	r := l.aiCostDaily
	now := l.now()
	if _, err := q.AddAppRateLimit(ctx, db.AddAppRateLimitParams{Bucket: r.Bucket, Now: now, WindowStart: windowStart(r, now), Amount: int32(cost)}); err != nil {
		return fmt.Errorf("add ai cost: %w", err)
	}
	return nil
}

// Hit は、rules を順に1つずつ数え、上限を超えたものがあればそこで止めて 429 のエラーを返す。
// 上限を超えたリクエストも1回として数える（連打を続けると待ち時間が延びるのではなく、期間が切り替わるまで拒否され続ける）。
func (l *Limiter) Hit(ctx context.Context, q *db.Queries, userID uuid.UUID, rules ...Rule) error {
	return hit(ctx, q, userID, l.now(), rules)
}

func hit(ctx context.Context, q *db.Queries, userID uuid.UUID, now time.Time, rules []Rule) error {
	for _, r := range rules {
		start := windowStart(r, now)
		var count int32
		var err error
		if r.AppWide {
			count, err = q.AddAppRateLimit(ctx, db.AddAppRateLimitParams{Bucket: r.Bucket, Now: now, WindowStart: start, Amount: 1})
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

// windowStart は、now の時点で数えている期間の始まりを返す。Daily なら日本時間のその日の0時。
func windowStart(r Rule, now time.Time) time.Time {
	if !r.Daily {
		return now.Add(-r.Window)
	}
	t := now.In(jst)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, jst)
}
