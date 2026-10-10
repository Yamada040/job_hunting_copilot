package profile

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

type fakeStore struct {
	updated *Update
}

func (f *fakeStore) Get(_ context.Context, userID uuid.UUID) (Profile, error) {
	return Profile{ID: userID}, nil
}

func (f *fakeStore) Update(_ context.Context, userID uuid.UUID, u Update) (Profile, error) {
	f.updated = &u
	return Profile{ID: userID}, nil
}

func TestUpdateTrimsSpaces(t *testing.T) {
	store := &fakeStore{}
	s := NewService(store, nil)

	if _, err := s.Update(t.Context(), uuid.New(), Update{FullName: ptr("  山田太郎 "), University: ptr("   ")}); err != nil {
		t.Fatalf("Update: %v", err)
	}

	if *store.updated.FullName != "山田太郎" {
		t.Errorf("FullName = %q, want trimmed", *store.updated.FullName)
	}
	if *store.updated.University != "" {
		t.Errorf("University = %q, want empty so that it is cleared", *store.updated.University)
	}
	if store.updated.Faculty != nil {
		t.Error("Faculty was not given, want it left unchanged (nil)")
	}
}

func TestUpdateRejectsBlankFullName(t *testing.T) {
	store := &fakeStore{}
	s := NewService(store, nil)

	_, err := s.Update(t.Context(), uuid.New(), Update{FullName: ptr("   ")})

	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != platform.KindInvalid || appErr.Fields[0].Field != "fullName" {
		t.Errorf("error = %v, want an invalid fullName error", err)
	}
	if store.updated != nil {
		t.Error("store was updated, want no update on invalid input")
	}
}

func TestIsDeveloperOnlyForListedUsers(t *testing.T) {
	dev := uuid.New()
	s := NewService(&fakeStore{}, []uuid.UUID{dev})

	if !s.IsDeveloper(dev) {
		t.Error("listed user is not a developer")
	}
	if s.IsDeveloper(uuid.New()) {
		t.Error("unlisted user is a developer")
	}
}
