package ratelimit

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai/aitest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
)

// costLimiter は、利用料の上限を budget マイクロドルにし、料金を1トークン1マイクロドルにした Limiter を返す。
func costLimiter(t *testing.T, pool *pgxpool.Pool, budget int) *Limiter {
	t.Helper()
	l := unlimitedLimiter()
	l.aiCostDaily = appRule(t, pool, budget)
	l.aiPrices = Prices{Input: 1, Output: 1}
	return l
}

func spentToday(t *testing.T, l *Limiter, q *db.Queries) int {
	t.Helper()
	spent, err := q.GetAppRateLimit(t.Context(), db.GetAppRateLimitParams{Bucket: l.aiCostDaily.Bucket, WindowStart: windowStart(l.aiCostDaily, l.now())})
	if err != nil {
		t.Fatalf("get ai cost: %v", err)
	}
	return int(spent)
}

func TestAddAICostAddsInputAndOutputPricesRoundedUp(t *testing.T) {
	pool := dbtest.Connect(t)
	l := costLimiter(t, pool, 1_000_000)
	l.aiPrices = Prices{Input: 0.30, Output: 2.50}
	q := db.New(pool)

	// 1000 × 0.30 + 400 × 2.50 = 1300
	if err := l.AddAICost(t.Context(), q, ai.Usage{InputTokens: 1000, OutputTokens: 400}); err != nil {
		t.Fatalf("add: %v", err)
	}
	// 0.30 + 2.50 = 2.8 は 3 に切り上げる
	if err := l.AddAICost(t.Context(), q, ai.Usage{InputTokens: 1, OutputTokens: 1}); err != nil {
		t.Fatalf("add: %v", err)
	}
	if got := spentToday(t, l, q); got != 1303 {
		t.Errorf("spent %d microdollars, want 1303", got)
	}
}

func TestHitAIAndCompanyAnalysisRejectedOnceAICostReachesBudget(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	l := costLimiter(t, pool, 1000)
	q := db.New(pool)

	if err := l.AddAICost(t.Context(), q, ai.Usage{InputTokens: 600, OutputTokens: 399}); err != nil {
		t.Fatalf("add: %v", err)
	}
	if err := l.HitAI(t.Context(), q, userID); err != nil {
		t.Fatalf("hit below the budget: %v, want allowed", err)
	}
	if err := l.AddAICost(t.Context(), q, ai.Usage{InputTokens: 1}); err != nil {
		t.Fatalf("add: %v", err)
	}
	if err := l.HitAI(t.Context(), q, userID); !isRateLimited(err) {
		t.Errorf("HitAI at the budget: %v, want rate limited", err)
	}
	if err := l.HitCompanyAnalysis(t.Context(), q, userID); !isRateLimited(err) {
		t.Errorf("HitCompanyAnalysis at the budget: %v, want rate limited", err)
	}
}

func TestAICostResetsAtMidnightInJST(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	l := costLimiter(t, pool, 1000)
	now := time.Date(2026, 10, 10, 23, 50, 0, 0, jst)
	l.now = func() time.Time { return now }
	q := db.New(pool)

	if err := l.AddAICost(t.Context(), q, ai.Usage{OutputTokens: 1000}); err != nil {
		t.Fatalf("add: %v", err)
	}
	if err := l.HitAI(t.Context(), q, userID); !isRateLimited(err) {
		t.Fatalf("hit on the same day: %v, want rate limited", err)
	}

	now = time.Date(2026, 10, 11, 0, 10, 0, 0, jst)
	if err := l.HitAI(t.Context(), q, userID); err != nil {
		t.Errorf("hit after midnight in JST: %v, want allowed", err)
	}
	if err := l.AddAICost(t.Context(), q, ai.Usage{InputTokens: 10}); err != nil {
		t.Fatalf("add: %v", err)
	}
	if got := spentToday(t, l, q); got != 10 {
		t.Errorf("spent %d microdollars after midnight, want 10 (the previous day is not carried over)", got)
	}
}

// 呼ぶ前に確かめ、呼んだ後に足すので、同時に処理中の分だけは上限を超えうる。その超え方が処理中の件数分に収まり、足した分が漏れないことを確かめる
func TestAICostUnderConcurrentRequestsOvershootsOnlyByInFlightRequests(t *testing.T) {
	pool := dbtest.Connect(t)
	const budget, cost, requests = 500, 100, 20
	l := costLimiter(t, pool, budget)
	users := make([]uuid.UUID, requests)
	for i := range users {
		users[i] = dbtest.CreateUser(t, pool)
	}

	var allowed atomic.Int32
	var wg sync.WaitGroup
	for _, userID := range users {
		wg.Go(func() {
			q := db.New(pool)
			if err := l.HitAI(t.Context(), q, userID); err != nil {
				return
			}
			allowed.Add(1)
			if err := l.AddAICost(t.Context(), q, ai.Usage{InputTokens: cost}); err != nil {
				t.Errorf("add: %v", err)
			}
		})
	}
	wg.Wait()

	q := db.New(pool)
	spent := spentToday(t, l, q)
	if spent != int(allowed.Load())*cost {
		t.Errorf("spent %d microdollars for %d allowed requests, want %d (no lost additions)", spent, allowed.Load(), int(allowed.Load())*cost)
	}
	if spent < budget || spent >= budget+requests*cost {
		t.Errorf("spent %d microdollars, want at least the budget %d and less than the budget plus all requests", spent, budget)
	}
	if err := l.HitAI(t.Context(), q, dbtest.CreateUser(t, pool)); !isRateLimited(err) {
		t.Errorf("hit after the budget is used: %v, want rate limited", err)
	}
}

func TestTrackCostAddsUsageEvenWhenGenerationFails(t *testing.T) {
	pool := dbtest.Connect(t)
	l := costLimiter(t, pool, 1_000_000)
	fake := &aitest.Fake{Reply: "結果", Usage: ai.Usage{InputTokens: 100, OutputTokens: 20}}
	gen := l.TrackCost(fake, pool)

	if _, _, err := gen.Generate(t.Context(), ai.KindInterviewReview, "入力"); err != nil {
		t.Fatalf("generate: %v", err)
	}
	fake.Err = errors.New("途中で時間切れ")
	if _, _, err := gen.AnalyzeCompany(t.Context(), "入力"); err == nil {
		t.Fatal("analyze: want the error from the AI")
	}
	if got := spentToday(t, l, db.New(pool)); got != 240 {
		t.Errorf("spent %d microdollars, want 240 (both calls, including the failed one)", got)
	}
}
