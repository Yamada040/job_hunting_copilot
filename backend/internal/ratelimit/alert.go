package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// alertWindow は、Alert を数え直す間隔。この間に知らせるのは種類ごとに1回まで。
const alertWindow = time.Hour

// アプリの中で起きる、回数の枠と利用料にかかわる出来事
var (
	// limitReached は、アプリ全体の枠（またはIPごとの枠）で断ったこと。Name に枠の名前を足して、枠ごとに知らせる
	limitReached = platform.Alert{Name: "limit_reached", Message: "app-wide rate limit reached"}
	// userKeepsHittingLimits は、1人が自分の上限で断られ続けていること（AIの連打やスクリプト）。1人ごとに数える
	userKeepsHittingLimits = platform.Alert{Name: "user_rate_limited", Message: "a user keeps hitting rate limits", Threshold: 10}
	aiBudgetReached        = platform.Alert{Name: "ai_budget_reached", Message: "ai daily budget reached"}
	// aiExpensiveCall は、1回の呼び出しが1日の上限の expensiveShare を超えたこと。長い入力で費用をかさませる攻撃の疑い
	aiExpensiveCall = platform.Alert{Name: "ai_expensive_call", Message: "expensive ai call"}
	// ContactHoneypot は、問い合わせの隠した欄に値が入った（自動送信の）こと
	ContactHoneypot = platform.Alert{Name: "contact_honeypot", Message: "contact honeypot filled"}
)

// expensiveShare は、1回の呼び出しを「高い」とみなす、1日の利用料の上限に対する割合。
// 既定の上限 $1 なら $0.05。普段の添削は1回 $0.01 に届かないので、これを超えるのは異常に長い入力や出力
const expensiveShare = 0.05

// budgetMilestones は、1日の利用料が上限に近づいたことを知らせる割合（％）。止まる前に気づけるようにする
var budgetMilestones = []int{50, 80}

// Alerter は、platform.Notify から呼ばれ、Alert をアプリ全体で数える。
func (l *Limiter) Alerter(conn db.DBTX) platform.Alerter {
	return alerter{limiter: l, q: db.New(conn)}
}

type alerter struct {
	limiter *Limiter
	q       *db.Queries
}

func (a alerter) Notify(ctx context.Context, alert platform.Alert) {
	a.limiter.notify(ctx, a.q, alert)
}

// notify は、alert を1回数え、今の1時間で Threshold を超えた最初の回だけ Warn で知らせる。
// 「超えた最初の回」を別に覚えずに決められるのは、数えた後の回数が1つずつ増えて返るため。
// 数えられなくても元の処理は止めない（知らせるための処理で、利用者の操作を失敗させない）
func (l *Limiter) notify(ctx context.Context, q *db.Queries, alert platform.Alert) {
	// 利用者が接続を切っても、起きたことは数える
	ctx = context.WithoutCancel(ctx)
	bucket := "alert:" + alert.Name
	now := l.now()
	count, err := q.AddAppRateLimit(ctx, db.AddAppRateLimitParams{Bucket: bucket, Now: now, WindowStart: now.Add(-alertWindow), Amount: 1})
	if err != nil {
		platform.Logger(ctx).Error("count alert", "bucket", bucket, "error", err)
		return
	}
	if int(count) == alert.Threshold+1 {
		platform.Logger(ctx).Warn(alert.Message, "bucket", bucket)
	}
}

// notifyUser は、notify と同じことを1人ごとに数えて行う。Slack にはユーザーIDを出さず、枠の名前だけを出す。
func (l *Limiter) notifyUser(ctx context.Context, q *db.Queries, userID uuid.UUID, alert platform.Alert) {
	ctx = context.WithoutCancel(ctx)
	bucket := "alert:" + alert.Name
	now := l.now()
	count, err := q.HitRateLimit(ctx, db.HitRateLimitParams{UserID: userID, Bucket: bucket, Now: now, WindowStart: now.Add(-alertWindow)})
	if err != nil {
		platform.Logger(ctx).Error("count alert", "bucket", bucket, "error", err)
		return
	}
	if int(count) == alert.Threshold+1 {
		platform.Logger(ctx).Warn(alert.Message, "bucket", bucket)
	}
}

// notifyCost は、AIの1回の呼び出しの料金 cost と、それを足した今日の合計 spent から、利用料にかかわる出来事を知らせる。
func (l *Limiter) notifyCost(ctx context.Context, q *db.Queries, cost, spent int) {
	budget := l.aiCostDaily.Max
	if budget <= 0 {
		return
	}
	if float64(cost) > float64(budget)*expensiveShare {
		l.notify(ctx, q, aiExpensiveCall)
	}
	// 割合をまたいだ呼び出しは1日に1回だけなので、数えずにそのまま知らせる
	before := spent - cost
	for _, percent := range budgetMilestones {
		line := budget * percent / 100
		if before < line && spent >= line {
			platform.Logger(ctx).Warn(fmt.Sprintf("ai daily budget %d%% used", percent), "bucket", l.aiCostDaily.Bucket)
		}
	}
}
