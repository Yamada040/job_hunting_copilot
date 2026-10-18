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
	l := &Limiter{now: time.Now, aiAppDaily: appRule(t, pool, 1)}
	q := db.New(pool)

	if err := l.HitAI(t.Context(), q, userA); err != nil {
		t.Fatalf("user A: %v, want allowed", err)
	}
	err := l.HitAI(t.Context(), q, userB)
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
	l := &Limiter{now: time.Now, aiAppDaily: appRule(t, pool, AIBurst.Max+1)}
	q := db.New(pool)

	for range AIBurst.Max + 5 {
		_ = l.HitAI(t.Context(), q, heavyUser)
	}
	if err := l.HitAI(t.Context(), q, otherUser); err != nil {
		t.Errorf("other user: %v, want allowed because rejected requests do not use the app-wide limit", err)
	}
}

func TestAppLimitAllowsExactlyMaxUnderConcurrentRequestsFromManyUsers(t *testing.T) {
	pool := dbtest.Connect(t)
	l := &Limiter{now: time.Now, companyAnalysisAppDaily: appRule(t, pool, 12)}
	users := make([]uuid.UUID, 20)
	for i := range users {
		users[i] = dbtest.CreateUser(t, pool)
	}

	var allowed atomic.Int32
	var wg sync.WaitGroup
	for _, userID := range users {
		wg.Go(func() {
			if err := l.HitCompanyAnalysis(t.Context(), db.New(pool), userID); err == nil {
				allowed.Add(1)
			}
		})
	}
	wg.Wait()

	if allowed.Load() != 12 {
		t.Errorf("%d of 20 concurrent requests from different users were allowed, want exactly 12", allowed.Load())
	}
}
