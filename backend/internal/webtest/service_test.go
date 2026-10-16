package webtest

import (
	"errors"
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func TestIsCorrectIgnoresSpacesAndCase(t *testing.T) {
	cases := []struct {
		answer, correct string
		want            bool
	}{
		{" B ", "b", true},
		{"ABC", "abc", true},
		{"A", "B", false},
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

	q, reward, err := s.Create(t.Context(), userID, NewQuestion{Title: "推論", Body: "AはBより…", Answer: "B", Choices: []string{"A", " ", "B"}})
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

func TestUpdateKeepsAttempts(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService())
	q, _, err := s.Create(t.Context(), userID, NewQuestion{Title: "更新前", Body: "本文", Answer: "A"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, _, err := s.Answer(t.Context(), userID, q.ID, "A", nil); err != nil {
		t.Fatalf("Answer: %v", err)
	}

	updated, err := s.Update(t.Context(), userID, q.ID, NewQuestion{
		Title: "更新後", Body: "更新した本文", Answer: "B", Choices: []string{"A", "B"},
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Title != "更新後" || updated.Answer != "B" || len(updated.Choices) != 2 || len(updated.Attempts) != 1 {
		t.Errorf("Update = %+v, want updated question with one existing attempt", updated)
	}
}

func TestOtherUsersQuestionIsNotFound(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService())
	q, _, err := s.Create(t.Context(), alice, NewQuestion{Title: "問題", Body: "本文", Answer: "A"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	for _, err := range []error{
		func() error { _, err := s.Get(t.Context(), bob, q.ID); return err }(),
		func() error { _, _, err := s.Answer(t.Context(), bob, q.ID, "A", nil); return err }(),
	} {
		var appErr *platform.Error
		if !errors.As(err, &appErr) || appErr.Kind != platform.KindNotFound {
			t.Errorf("error = %v, want not found", err)
		}
	}
}
