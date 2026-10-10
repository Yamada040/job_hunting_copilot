package calendar

import (
	"errors"
	"testing"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/es"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func ptr[T any](v T) *T { return &v }

func day(s string) *time.Time {
	d, _ := time.Parse(time.DateOnly, s)
	return &d
}

func assertKind(t *testing.T, err error, kind platform.Kind) {
	t.Helper()
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != kind {
		t.Fatalf("error = %v, want kind %v", err, kind)
	}
}

func TestListMergesEventsAndESDeadlinesByDate(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	x := xp.NewService()
	c, _, err := company.NewService(pool, x).Create(t.Context(), userID, company.Fields{Name: ptr("サンプル")})
	if err != nil {
		t.Fatalf("create company: %v", err)
	}
	if _, err := es.NewService(pool, x).Create(t.Context(), userID, es.Fields{CompanyID: &c.ID, Title: ptr("本選考ES"), Deadline: day("2026-11-05")}); err != nil {
		t.Fatalf("create es: %v", err)
	}
	s := NewService(pool)
	for _, d := range []string{"2026-11-10", "2026-11-01", "2026-12-01"} {
		if _, err := s.Create(t.Context(), userID, Fields{Title: ptr("予定 " + d), Date: day(d)}); err != nil {
			t.Fatalf("Create: %v", err)
		}
	}

	items, err := s.List(t.Context(), userID, day("2026-11-01"), day("2026-11-30"))
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	got := []string{}
	for _, i := range items {
		got = append(got, i.Date.Format(time.DateOnly)+"/"+string(i.Source))
	}
	want := []string{"2026-11-01/event", "2026-11-05/es_deadline", "2026-11-10/event"}
	if len(got) != len(want) {
		t.Fatalf("items = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("items = %v, want %v", got, want)
		}
	}
	if items[1].Title != "本選考ES" || items[1].Type != db.CalendarEventTypeEs || *items[1].CompanyName != "サンプル" {
		t.Errorf("deadline item = %+v, want the ES title, es type, and company", items[1])
	}
}

func TestCreateKeepsTimeAndUpdateClearsIt(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool)

	item, err := s.Create(t.Context(), userID, Fields{Title: ptr("説明会"), Date: day("2026-11-01"), Time: ptr("09:30"), Type: ptr(db.CalendarEventTypeIntern)})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if item.Time == nil || *item.Time != "09:30" || item.Type != db.CalendarEventTypeIntern {
		t.Fatalf("item = %+v, want time 09:30 and type intern", item)
	}

	updated, err := s.Update(t.Context(), userID, item.ID, Fields{SetTime: true})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Time != nil || updated.Title != "説明会" {
		t.Errorf("item = %+v, want time cleared and title kept", updated)
	}
}

func TestCompanyLinkIsOptionalAndMustBeOwn(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	c, _, err := company.NewService(pool, xp.NewService()).Create(t.Context(), alice, company.Fields{Name: ptr("サンプル")})
	if err != nil {
		t.Fatalf("create company: %v", err)
	}
	s := NewService(pool)

	_, err = s.Create(t.Context(), bob, Fields{Title: ptr("予定"), Date: day("2026-11-01"), CompanyID: &c.ID})
	assertKind(t, err, platform.KindInvalid)

	item, err := s.Create(t.Context(), alice, Fields{Title: ptr("予定"), Date: day("2026-11-01"), CompanyID: &c.ID})
	if err != nil || item.CompanyName == nil || *item.CompanyName != "サンプル" {
		t.Fatalf("Create = %+v, %v; want linked to the company", item, err)
	}
	unlinked, err := s.Update(t.Context(), alice, item.ID, Fields{SetCompanyID: true})
	if err != nil || unlinked.CompanyID != nil {
		t.Errorf("Update = %+v, %v; want the company unlinked", unlinked, err)
	}
}

func TestOtherUsersEventIsNotFound(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	s := NewService(pool)
	item, err := s.Create(t.Context(), alice, Fields{Title: ptr("予定"), Date: day("2026-11-01")})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	_, err = s.Update(t.Context(), bob, item.ID, Fields{Title: ptr("書き換え")})
	assertKind(t, err, platform.KindNotFound)
	err = s.Delete(t.Context(), bob, item.ID)
	assertKind(t, err, platform.KindNotFound)
	if items, _ := s.List(t.Context(), bob, nil, nil); len(items) != 0 {
		t.Errorf("bob sees %d items, want none", len(items))
	}
}
