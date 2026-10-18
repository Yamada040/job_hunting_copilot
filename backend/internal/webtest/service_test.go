package webtest

import (
	"errors"
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func TestIsCorrectIgnoresSpacesCaseAndWidth(t *testing.T) {
	cases := []struct {
		answer, correct string
		want            bool
	}{
		{" B ", "b", true},
		{"ABC", "abc", true},
		{"A", "B", false},
		{"１２", "12", true},
		{"　ｂ　", "B", true},
		{"ｶﾞ", "ガ", true},
	}
	for _, c := range cases {
		if got := IsCorrect(c.answer, c.correct); got != c.want {
			t.Errorf("IsCorrect(%q, %q) = %v, want %v", c.answer, c.correct, got, c.want)
		}
	}
}

func TestCreateAndAnswer(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService())

	q, reward, err := s.Create(t.Context(), userID, Fields{Title: "推論", Body: "AはBより…", Answer: "B", Choices: []string{"A", " ", "B"}})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if reward.Awarded != 5 || len(q.Choices) != 2 {
		t.Errorf("reward = %+v, choices = %v; want 5 XP and blank choices removed", reward, q.Choices)
	}

	wrong, _, err := s.Answer(t.Context(), userID, q.ID, "A", nil)
	if err != nil {
		t.Fatalf("Answer: %v", err)
	}
	right, _, err := s.Answer(t.Context(), userID, q.ID, " b ", nil)
	if err != nil {
		t.Fatalf("Answer: %v", err)
	}
	if *wrong.IsCorrect || !*right.IsCorrect {
		t.Errorf("wrong = %v, right = %v; want false then true", *wrong.IsCorrect, *right.IsCorrect)
	}

	got, err := s.Get(t.Context(), userID, q.ID)
	if err != nil || len(got.Attempts) != 2 {
		t.Errorf("Get = %d attempts, %v; want 2 attempts", len(got.Attempts), err)
	}
}

func TestCreateStopsAtLimitPerUser(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService())
	if _, err := pool.Exec(t.Context(),
		`insert into webtest_questions (user_id, title, body, answer) select $1, '問題', '本文', 'A' from generate_series(1, $2)`,
		alice, maxQuestions); err != nil {
		t.Fatalf("fill questions: %v", err)
	}

	_, _, err := s.Create(t.Context(), alice, Fields{Title: "上限を超える問題", Body: "本文", Answer: "A"})
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != platform.KindConflict {
		t.Errorf("error = %v, want conflict", err)
	}
	if _, _, err := s.Create(t.Context(), bob, Fields{Title: "問題", Body: "本文", Answer: "A"}); err != nil {
		t.Errorf("Create for another user: %v, want success", err)
	}
}

func TestAnswerKeepsOnlyRecentAttemptsOfTheQuestion(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService())
	q, _, err := s.Create(t.Context(), userID, Fields{Title: "問題", Body: "本文", Answer: "A"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	other, _, err := s.Create(t.Context(), userID, Fields{Title: "別の問題", Body: "本文", Answer: "A"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, err := pool.Exec(t.Context(),
		`insert into webtest_attempts (user_id, question_id, is_correct, created_at)
		 select $1, question_id, false, now() - make_interval(days => n)
		 from unnest(array[$2::uuid, $3::uuid]) as question_id, generate_series(1, $4) as n`,
		userID, q.ID, other.ID, keptAttempts); err != nil {
		t.Fatalf("fill attempts: %v", err)
	}

	latest, _, err := s.Answer(t.Context(), userID, q.ID, "A", nil)
	if err != nil {
		t.Fatalf("Answer: %v", err)
	}

	got, err := s.Get(t.Context(), userID, q.ID)
	if err != nil || len(got.Attempts) != keptAttempts || got.Attempts[0].ID != latest.ID {
		t.Errorf("Get = %d attempts, %v; want the newest %d attempts", len(got.Attempts), err, keptAttempts)
	}
	untouched, err := s.Get(t.Context(), userID, other.ID)
	if err != nil || len(untouched.Attempts) != keptAttempts {
		t.Errorf("other question = %d attempts, %v; want its attempts kept", len(untouched.Attempts), err)
	}
}

func TestOtherUsersQuestionIsNotFound(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService())
	q, _, err := s.Create(t.Context(), alice, Fields{Title: "問題", Body: "本文", Answer: "A"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	for _, err := range []error{
		func() error { _, err := s.Get(t.Context(), bob, q.ID); return err }(),
		func() error { _, _, err := s.Answer(t.Context(), bob, q.ID, "A", nil); return err }(),
		func() error {
			_, err := s.Update(t.Context(), bob, q.ID, Fields{Title: "書き換え", Body: "本文", Answer: "B"})
			return err
		}(),
		s.Delete(t.Context(), bob, q.ID),
	} {
		var appErr *platform.Error
		if !errors.As(err, &appErr) || appErr.Kind != platform.KindNotFound {
			t.Errorf("error = %v, want not found", err)
		}
	}
}

func TestUpdateJudgesWithNewAnswerAndKeepsPastAttempts(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService())
	q, _, err := s.Create(t.Context(), userID, Fields{Title: "問題", Body: "本文", Answer: "B", Explanation: ptr("解説")})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, _, err := s.Answer(t.Context(), userID, q.ID, "A", nil); err != nil {
		t.Fatalf("Answer: %v", err)
	}

	updated, err := s.Update(t.Context(), userID, q.ID, Fields{Title: " 書き換えた問題 ", Body: "本文", Answer: "A"})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Title != "書き換えた問題" || updated.Explanation != nil {
		t.Errorf("title = %q, explanation = %v; want the trimmed title and the omitted explanation cleared", updated.Title, updated.Explanation)
	}
	if len(updated.Attempts) != 1 || *updated.Attempts[0].IsCorrect {
		t.Errorf("attempts = %+v, want the past incorrect attempt kept as it was", updated.Attempts)
	}
	attempt, _, err := s.Answer(t.Context(), userID, q.ID, "A", nil)
	if err != nil || !*attempt.IsCorrect {
		t.Errorf("answer after update = %v, %v; want correct with the new answer", attempt.IsCorrect, err)
	}

	_, err = s.Update(t.Context(), userID, q.ID, Fields{Title: "問題", Body: "本文", Answer: "  "})
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != platform.KindInvalid {
		t.Errorf("update with a blank answer: %v, want invalid", err)
	}
}

func TestDeleteRemovesQuestionWithAttempts(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService())
	q, _, err := s.Create(t.Context(), userID, Fields{Title: "問題", Body: "本文", Answer: "A"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, _, err := s.Answer(t.Context(), userID, q.ID, "A", nil); err != nil {
		t.Fatalf("Answer: %v", err)
	}

	if err := s.Delete(t.Context(), userID, q.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	var attempts int
	if err := pool.QueryRow(t.Context(), `select count(*) from webtest_attempts where question_id = $1`, q.ID).Scan(&attempts); err != nil {
		t.Fatalf("count attempts: %v", err)
	}
	if attempts != 0 {
		t.Errorf("%d attempts remain, want 0", attempts)
	}
	_, err = s.Get(t.Context(), userID, q.ID)
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != platform.KindNotFound {
		t.Errorf("Get after delete: %v, want not found", err)
	}
}

func ptr[T any](v T) *T { return &v }
