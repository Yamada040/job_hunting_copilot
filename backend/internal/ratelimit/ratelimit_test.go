package ratelimit

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

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
	l := NewLimiter()
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
