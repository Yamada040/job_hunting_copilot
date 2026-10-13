package calendar

import (
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

func TestFeedReturnsOnlyTheOwnersItems(t *testing.T) {
	pool := dbtest.Connect(t)
	s := NewService(pool)
	owner := dbtest.CreateUser(t, pool)
	other := dbtest.CreateUser(t, pool)
	if _, err := s.Create(t.Context(), owner, Fields{Title: ptr("本人の予定"), Date: day("2026-11-01")}); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, err := s.Create(t.Context(), other, Fields{Title: ptr("他人の予定"), Date: day("2026-11-01")}); err != nil {
		t.Fatalf("Create: %v", err)
	}

	token, _, err := s.CreateFeed(t.Context(), owner)
	if err != nil {
		t.Fatalf("CreateFeed: %v", err)
	}
	items, err := s.FeedItems(t.Context(), token)
	if err != nil {
		t.Fatalf("FeedItems: %v", err)
	}
	if len(items) != 1 || items[0].Title != "本人の予定" {
		t.Fatalf("items = %+v, want 本人の予定だけ", items)
	}
}

func TestFeedStopsWorkingAfterRecreateOrDelete(t *testing.T) {
	pool := dbtest.Connect(t)
	s := NewService(pool)
	userID := dbtest.CreateUser(t, pool)

	old, _, err := s.CreateFeed(t.Context(), userID)
	if err != nil {
		t.Fatalf("CreateFeed: %v", err)
	}
	renewed, _, err := s.CreateFeed(t.Context(), userID)
	if err != nil {
		t.Fatalf("CreateFeed again: %v", err)
	}
	_, err = s.FeedItems(t.Context(), old)
	assertKind(t, err, platform.KindNotFound)
	if _, err := s.FeedItems(t.Context(), renewed); err != nil {
		t.Fatalf("作り直したURLで読めません: %v", err)
	}

	if err := s.DeleteFeed(t.Context(), userID); err != nil {
		t.Fatalf("DeleteFeed: %v", err)
	}
	_, err = s.FeedItems(t.Context(), renewed)
	assertKind(t, err, platform.KindNotFound)
	status, err := s.FeedStatus(t.Context(), userID)
	if err != nil || status.Enabled {
		t.Fatalf("FeedStatus = %+v, %v, want 止めた状態", status, err)
	}
}
