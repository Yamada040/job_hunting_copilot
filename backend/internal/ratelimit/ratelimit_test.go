package ratelimit

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

var testRule = Rule{Bucket: "test", Max: 3, Window: time.Minute, Message: "多すぎます"}

func isRateLimited(err error) bool {
	var appErr *platform.Error
	return errors.As(err, &appErr) && appErr.Kind == platform.KindRateLimited
}

func TestHitRejectsAfterMaxAndResetsAfterWindow(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	now := time.Date(2026, 10, 10, 12, 0, 0, 0, time.UTC)
	l := &Limiter{now: func() time.Time { return now }}
	q := db.New(pool)

	for i := range 3 {
		if err := l.Hit(t.Context(), q, userID, testRule); err != nil {
			t.Fatalf("hit %d: %v, want allowed", i+1, err)
		}
	}
	if err := l.Hit(t.Context(), q, userID, testRule); !isRateLimited(err) {
		t.Fatalf("4th hit: %v, want rate limited", err)
	}

	now = now.Add(time.Minute + time.Second)
	if err := l.Hit(t.Context(), q, userID, testRule); err != nil {
		t.Errorf("hit after the window: %v, want allowed", err)
	}
}

func TestDailyRuleResetsAtMidnightInJST(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	daily := Rule{Bucket: "test_daily", Max: 1, Daily: true, Message: "今日はもう使えません"}
	// 日本時間の 23:50。UTC ではまだ同じ日の 14:50
	now := time.Date(2026, 10, 10, 23, 50, 0, 0, jst)
	l := &Limiter{now: func() time.Time { return now }}
	q := db.New(pool)

	if err := l.Hit(t.Context(), q, userID, daily); err != nil {
		t.Fatalf("first hit: %v", err)
	}
	if err := l.Hit(t.Context(), q, userID, daily); !isRateLimited(err) {
		t.Fatalf("second hit on the same day: %v, want rate limited", err)
	}

	now = time.Date(2026, 10, 11, 0, 10, 0, 0, jst)
	if err := l.Hit(t.Context(), q, userID, daily); err != nil {
		t.Errorf("hit after midnight in JST: %v, want allowed", err)
	}
}

func TestHitAllowsExactlyMaxUnderConcurrentRequests(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	l := NewLimiter(DefaultAppLimits)
	rule := Rule{Bucket: "test_concurrent", Max: 12, Window: time.Minute, Message: "多すぎます"}

	var allowed atomic.Int32
	var wg sync.WaitGroup
	for range 20 {
		wg.Go(func() {
			if err := l.Hit(t.Context(), db.New(pool), userID, rule); err == nil {
				allowed.Add(1)
			}
		})
	}
	wg.Wait()

	if allowed.Load() != 12 {
		t.Errorf("%d of 20 concurrent requests were allowed, want exactly 12", allowed.Load())
	}
}

// unlimitedLimiter は、アプリ全体の回数と利用料の上限では止まらない Limiter を返す。確かめたい枠だけを appRule で差し替えて使う。
func unlimitedLimiter() *Limiter {
	return NewLimiter(AppLimits{AIDaily: 1 << 30, CompanyAnalysisDaily: 1 << 30, AIDailyBudget: 1 << 20})
}

// appRule は、アプリ全体の枠を、ほかのテストや手元の過去の実行と混ざらないよう、このテストだけの名前で作る。
func appRule(t *testing.T, pool *pgxpool.Pool, max int) Rule {
	t.Helper()
	bucket := "test_app_" + uuid.NewString()
	t.Cleanup(func() {
		if _, err := pool.Exec(context.Background(), `delete from api_app_rate_limits where bucket = $1`, bucket); err != nil {
			t.Errorf("delete app rate limit: %v", err)
		}
	})
	return Rule{Bucket: bucket, Max: max, Daily: true, AppWide: true, Message: "アプリ全体の上限です"}
}

func TestHitAIRejectsOtherUsersAfterAppLimit(t *testing.T) {
	pool := dbtest.Connect(t)
	userA := dbtest.CreateUser(t, pool)
	userB := dbtest.CreateUser(t, pool)
	l := unlimitedLimiter()
	l.aiAppDaily = appRule(t, pool, 1)
	q := db.New(pool)

	if _, err := l.HitAI(t.Context(), q, userA); err != nil {
		t.Fatalf("user A: %v, want allowed", err)
	}
	_, err := l.HitAI(t.Context(), q, userB)
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != platform.KindRateLimited || appErr.Message != "アプリ全体の上限です" {
		t.Errorf("user B: %v, want rejected by the app-wide limit", err)
	}
}

func TestUserRejectedByOwnLimitDoesNotUseAppLimit(t *testing.T) {
	pool := dbtest.Connect(t)
	heavyUser := dbtest.CreateUser(t, pool)
	otherUser := dbtest.CreateUser(t, pool)
	// 連打した本人が通った回数（AIBurst.Max）と、ほかの人の1回で、ちょうど埋まる枠
	l := unlimitedLimiter()
	l.aiAppDaily = appRule(t, pool, AIBurst.Max+1)
	q := db.New(pool)

	for range AIBurst.Max + 5 {
		_, _ = l.HitAI(t.Context(), q, heavyUser)
	}
	if _, err := l.HitAI(t.Context(), q, otherUser); err != nil {
		t.Errorf("other user: %v, want allowed because rejected requests do not use the app-wide limit", err)
	}
}

func TestAppLimitAllowsExactlyMaxUnderConcurrentRequestsFromManyUsers(t *testing.T) {
	pool := dbtest.Connect(t)
	l := unlimitedLimiter()
	l.companyAnalysisAppDaily = appRule(t, pool, 12)
	users := make([]uuid.UUID, 20)
	for i := range users {
		users[i] = dbtest.CreateUser(t, pool)
	}

	var allowed atomic.Int32
	var wg sync.WaitGroup
	for _, userID := range users {
		wg.Go(func() {
			if _, err := l.HitCompanyAnalysis(t.Context(), db.New(pool), userID); err == nil {
				allowed.Add(1)
			}
		})
	}
	wg.Wait()

	if allowed.Load() != 12 {
		t.Errorf("%d of 20 concurrent requests from different users were allowed, want exactly 12", allowed.Load())
	}
}

func TestRefundReturnsDailyLimitsButNotBurst(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	now := time.Date(2026, 10, 10, 12, 0, 0, 0, jst)
	l := &Limiter{now: func() time.Time { return now }}
	q := db.New(pool)
	burst := Rule{Bucket: "test_refund_burst", Max: 1, Window: time.Minute, Message: "連打です"}
	daily := Rule{Bucket: "test_refund_daily", Max: 1, Daily: true, Message: "今日はもう使えません"}
	app := appRule(t, pool, 1)

	charge, err := l.charge(t.Context(), q, userID, burst, daily, app)
	if err != nil {
		t.Fatalf("first charge: %v", err)
	}
	charge.Refund(t.Context(), q)

	_, err = l.charge(t.Context(), q, userID, burst, daily, app)
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Message != burst.Message {
		t.Fatalf("charge right after refund: %v, want rejected by the burst limit", err)
	}
	now = now.Add(2 * time.Minute)
	if _, err := l.charge(t.Context(), q, userID, burst, daily, app); err != nil {
		t.Errorf("charge after the burst window: %v, want allowed because the daily limits were refunded", err)
	}
}

func TestRefundAfterDailyResetKeepsNewDayCount(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	daily := Rule{Bucket: "test_refund_reset", Max: 1, Daily: true, Message: "今日はもう使えません"}
	now := time.Date(2026, 10, 10, 23, 50, 0, 0, jst)
	l := &Limiter{now: func() time.Time { return now }}
	q := db.New(pool)

	yesterday, err := l.charge(t.Context(), q, userID, daily)
	if err != nil {
		t.Fatalf("charge before midnight: %v", err)
	}
	now = time.Date(2026, 10, 11, 0, 10, 0, 0, jst)
	if _, err := l.charge(t.Context(), q, userID, daily); err != nil {
		t.Fatalf("charge after midnight: %v", err)
	}
	yesterday.Refund(t.Context(), q)

	if _, err := l.charge(t.Context(), q, userID, daily); !isRateLimited(err) {
		t.Errorf("second charge of the new day: %v, want rate limited because refunding yesterday's charge must not reduce today's count", err)
	}
}

// dailyCount は、本人の1日の枠の今の回数を返す。
func dailyCount(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, bucket string) int {
	t.Helper()
	var count int
	err := pool.QueryRow(t.Context(), `select count from api_rate_limits where user_id = $1 and bucket = $2`, userID, bucket).Scan(&count)
	if err != nil {
		t.Fatalf("get rate limit %s: %v", bucket, err)
	}
	return count
}

// chargeAndRefund は、数えてすぐに戻す（AIの呼び出しが失敗したとき）を1回行う。
func chargeAndRefund(t *testing.T, l *Limiter, q *db.Queries, userID uuid.UUID, rule Rule) {
	t.Helper()
	charge, err := l.charge(t.Context(), q, userID, rule)
	if err != nil {
		t.Fatalf("charge: %v", err)
	}
	charge.Refund(t.Context(), q)
}

func TestRefundStopsAfterDailyRefundLimit(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	now := time.Date(2026, 10, 10, 12, 0, 0, 0, jst)
	l := &Limiter{now: func() time.Time { return now }}
	q := db.New(pool)
	daily := Rule{Bucket: "test_refund_limit_daily", Max: 100, Daily: true, Message: "今日はもう使えません"}

	for i := range AIRefundDaily.Max {
		chargeAndRefund(t, l, q, userID, daily)
		if got := dailyCount(t, pool, userID, daily.Bucket); got != 0 {
			t.Fatalf("after refund %d: count %d, want 0 because refunds within the limit are returned", i+1, got)
		}
	}
	for i := range 2 {
		chargeAndRefund(t, l, q, userID, daily)
		if got := dailyCount(t, pool, userID, daily.Bucket); got != i+1 {
			t.Errorf("after refund %d: count %d, want %d because refunds over the limit are not returned", AIRefundDaily.Max+i+1, got, i+1)
		}
	}
}

func TestRefundLimitIsPerUser(t *testing.T) {
	pool := dbtest.Connect(t)
	heavyUser := dbtest.CreateUser(t, pool)
	otherUser := dbtest.CreateUser(t, pool)
	now := time.Date(2026, 10, 10, 12, 0, 0, 0, jst)
	l := &Limiter{now: func() time.Time { return now }}
	q := db.New(pool)
	daily := Rule{Bucket: "test_refund_per_user_daily", Max: 100, Daily: true, Message: "今日はもう使えません"}

	for range AIRefundDaily.Max + 2 {
		chargeAndRefund(t, l, q, heavyUser, daily)
	}
	chargeAndRefund(t, l, q, otherUser, daily)

	if got := dailyCount(t, pool, otherUser, daily.Bucket); got != 0 {
		t.Errorf("other user's count %d, want 0 because another user's refunds do not use this user's refund limit", got)
	}
}

func TestRefundLimitResetsAtMidnightInJST(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	now := time.Date(2026, 10, 10, 12, 0, 0, 0, jst)
	l := &Limiter{now: func() time.Time { return now }}
	q := db.New(pool)
	daily := Rule{Bucket: "test_refund_next_day_daily", Max: 100, Daily: true, Message: "今日はもう使えません"}

	for range AIRefundDaily.Max + 1 {
		chargeAndRefund(t, l, q, userID, daily)
	}
	now = time.Date(2026, 10, 11, 0, 10, 0, 0, jst)
	chargeAndRefund(t, l, q, userID, daily)

	if got := dailyCount(t, pool, userID, daily.Bucket); got != 0 {
		t.Errorf("count on the next day %d, want 0 because the refund limit resets at midnight in JST", got)
	}
}
