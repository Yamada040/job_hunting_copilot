package xp

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

func award(t *testing.T, pool *pgxpool.Pool, s *Service, userID uuid.UUID, action db.XpAction, refID *uuid.UUID) Result {
	t.Helper()
	var res Result
	err := platform.InTx(t.Context(), pool, func(tx pgx.Tx) error {
		var err error
		res, err = s.Award(t.Context(), db.New(tx), userID, action, refID)
		return err
	})
	if err != nil {
		t.Fatalf("Award: %v", err)
	}
	return res
}

func newRef() *uuid.UUID {
	id := uuid.New()
	return &id
}

func TestLevelOf(t *testing.T) {
	cases := map[int]int{0: 1, 24: 1, 25: 2, 49: 2, 50: 3}
	for total, want := range cases {
		if got := LevelOf(total); got != want {
			t.Errorf("LevelOf(%d) = %d, want %d", total, got, want)
		}
	}
}

func TestAwardAddsXPAndReportsLevelUp(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)

	res := award(t, pool, NewService(), userID, db.XpActionEsSubmitted, newRef())

	if res != (Result{Awarded: 25, Total: 25, Level: 2, LeveledUp: true}) {
		t.Errorf("result = %+v, want 25 XP and level up to 2", res)
	}
}

func TestAwardGivesXPOnlyOncePerTarget(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService()
	ref := newRef()
	award(t, pool, s, userID, db.XpActionInterviewLog, ref)

	res := award(t, pool, s, userID, db.XpActionInterviewLog, ref)

	if res.Awarded != 0 || res.Total != 20 {
		t.Errorf("result = %+v, want no XP for the same target", res)
	}
}

func TestAwardStopsAtDailyCapAndResetsNextDayInJST(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	// 日本時間の 23:30。UTC ではまだ前日の 14:30 だが、日次上限は日本時間の日付で数える
	now := time.Date(2026, 10, 10, 23, 30, 0, 0, jst)
	s := &Service{now: func() time.Time { return now }}

	awarded := 0
	for range 6 {
		awarded += award(t, pool, s, userID, db.XpActionCompanyNew, newRef()).Awarded
	}
	if awarded != 25 {
		t.Fatalf("awarded %d XP in a day, want 25 (5 times x 5 XP)", awarded)
	}

	// xp_logs.created_at は実際の時刻なので、翌日になったことは「今日の始まり」を未来にずらして表す
	now = time.Now().Add(48 * time.Hour)
	if res := award(t, pool, s, userID, db.XpActionCompanyNew, newRef()); res.Awarded != 5 {
		t.Errorf("next day result = %+v, want 5 XP again", res)
	}
}

func TestAwardGivesInterviewLogXPUpToFiveTimesADay(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService()

	awarded := 0
	for range 6 {
		awarded += award(t, pool, s, userID, db.XpActionInterviewLog, newRef()).Awarded
	}

	// 面接ログを消して作り直すと別のログとして数えられるため、日次上限が無いと無限にXPを稼げてしまう
	if awarded != 100 {
		t.Errorf("awarded %d XP in a day, want 100 (5 times x 20 XP)", awarded)
	}
}

func TestAwardGivesFirstTimeOnlyActionsOnce(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService()
	award(t, pool, s, userID, db.XpActionAptitudeComplete, nil)

	res := award(t, pool, s, userID, db.XpActionAptitudeComplete, nil)

	if res.Awarded != 0 || res.Total != 15 {
		t.Errorf("result = %+v, want no XP the second time", res)
	}
}

func TestAwardKeepsDailyCapUnderConcurrentRequests(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService()

	var wg sync.WaitGroup
	for range 10 {
		wg.Go(func() {
			err := platform.InTx(context.Background(), pool, func(tx pgx.Tx) error {
				_, err := s.Award(context.Background(), db.New(tx), userID, db.XpActionCompanyNew, newRef())
				return err
			})
			if err != nil {
				t.Errorf("Award: %v", err)
			}
		})
	}
	wg.Wait()

	var total int
	if err := pool.QueryRow(t.Context(), `select xp from profiles where id = $1`, userID).Scan(&total); err != nil {
		t.Fatalf("read xp: %v", err)
	}
	if total != 25 {
		t.Errorf("total XP = %d after 10 concurrent requests, want 25 (daily cap of 5)", total)
	}
}
