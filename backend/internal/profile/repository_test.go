package profile

import (
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
)

func ptr(s string) *string { return &s }

func TestGetCreatesMissingProfile(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	repo := NewRepository(pool)

	p, err := repo.Get(t.Context(), userID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if p.ID != userID || p.XP != 0 || p.Level != 1 || p.FullName != nil {
		t.Errorf("profile = %+v, want a new empty profile with XP 0 and level 1", p)
	}

	again, err := repo.Get(t.Context(), userID)
	if err != nil {
		t.Fatalf("second Get: %v", err)
	}
	if again.ID != userID {
		t.Errorf("second Get returned %s, want the same profile", again.ID)
	}
}

func TestUpdateChangesOnlyGivenFields(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	repo := NewRepository(pool)
	if _, err := repo.Update(t.Context(), userID, Update{FullName: ptr("山田太郎"), University: ptr("東京大学")}); err != nil {
		t.Fatalf("first Update: %v", err)
	}

	p, err := repo.Update(t.Context(), userID, Update{Faculty: ptr("工学部"), University: ptr("")})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}

	if p.FullName == nil || *p.FullName != "山田太郎" {
		t.Errorf("FullName = %v, want it kept as 山田太郎", p.FullName)
	}
	if p.Faculty == nil || *p.Faculty != "工学部" {
		t.Errorf("Faculty = %v, want 工学部", p.Faculty)
	}
	if p.University != nil {
		t.Errorf("University = %v, want cleared by an empty string", *p.University)
	}
}

func TestUpdateDoesNotTouchOtherUsers(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	repo := NewRepository(pool)
	if _, err := repo.Update(t.Context(), bob, Update{FullName: ptr("ボブ")}); err != nil {
		t.Fatalf("Update bob: %v", err)
	}

	if _, err := repo.Update(t.Context(), alice, Update{FullName: ptr("アリス")}); err != nil {
		t.Fatalf("Update alice: %v", err)
	}

	p, err := repo.Get(t.Context(), bob)
	if err != nil {
		t.Fatalf("Get bob: %v", err)
	}
	if p.FullName == nil || *p.FullName != "ボブ" {
		t.Errorf("bob's FullName = %v, want ボブ", p.FullName)
	}
}
