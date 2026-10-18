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

func assertCompanyNotFound(t *testing.T, err error) {
	t.Helper()
	assertKind(t, err, platform.KindInvalid)
	var appErr *platform.Error
	errors.As(err, &appErr)
	if len(appErr.Fields) != 1 || appErr.Fields[0].Field != "companyId" || appErr.Fields[0].Message != "企業が見つかりません" {
		t.Errorf("fields = %+v, want companyId: 企業が見つかりません", appErr.Fields)
	}
}

func TestListMergesEventsAndESDeadlinesByDate(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	x := xp.NewService()
	c, _, err := company.NewService(pool, x, nil, nil).Create(t.Context(), userID, company.Fields{Name: ptr("サンプル")})
	if err != nil {
		t.Fatalf("create company: %v", err)
	}
	if _, err := es.NewService(pool, x, nil, nil).Create(t.Context(), userID, es.Fields{CompanyID: &c.ID, Title: ptr("本選考ES"), Deadline: day("2026-11-05")}); err != nil {
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
	c, _, err := company.NewService(pool, xp.NewService(), nil, nil).Create(t.Context(), alice, company.Fields{Name: ptr("サンプル")})
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

func TestUpdateRejectsOtherUsersCompany(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	c, _, err := company.NewService(pool, xp.NewService(), nil, nil).Create(t.Context(), alice, company.Fields{Name: ptr("サンプル")})
	if err != nil {
		t.Fatalf("create company: %v", err)
	}
	s := NewService(pool)
	item, err := s.Create(t.Context(), bob, Fields{Title: ptr("予定"), Date: day("2026-11-01")})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	_, err = s.Update(t.Context(), bob, item.ID, Fields{SetCompanyID: true, CompanyID: &c.ID})

	assertCompanyNotFound(t, err)
}

func TestCreateStopsAtLimitPerUser(t *testing.T) {
	pool := dbtest.Connect(t)
	alice := dbtest.CreateUser(t, pool)
	bob := dbtest.CreateUser(t, pool)
	s := NewService(pool)
	if _, err := pool.Exec(t.Context(),
		`insert into calendar_events (user_id, title, date) select $1, '予定', date '2026-11-01' from generate_series(1, $2)`,
		alice, maxEvents); err != nil {
		t.Fatalf("fill calendar events: %v", err)
	}

	_, err := s.Create(t.Context(), alice, Fields{Title: ptr("上限を超える予定"), Date: day("2026-11-01")})
	assertKind(t, err, platform.KindConflict)
	if _, err := s.Create(t.Context(), bob, Fields{Title: ptr("予定"), Date: day("2026-11-01")}); err != nil {
		t.Errorf("Create for another user: %v, want success", err)
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

func TestEventLinkCanBeSetAndCleared(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool)

	item, err := s.Create(t.Context(), userID, Fields{Title: ptr("一次面接"), Date: day("2026-11-01"), URL: ptr(" https://meet.example.com/abc ")})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if item.URL == nil || *item.URL != "https://meet.example.com/abc" {
		t.Fatalf("URL = %v, want 前後の空白を除いたリンク", item.URL)
	}

	updated, err := s.Update(t.Context(), userID, item.ID, Fields{SetURL: true, URL: nil})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.URL != nil {
		t.Fatalf("URL = %v, want リンクを消した状態", *updated.URL)
	}
}

func TestEventNoteCanBeSetAndCleared(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool)

	item, err := s.Create(t.Context(), userID, Fields{Title: ptr("説明会"), Date: day("2026-11-01"), Note: ptr("  持ち物: 筆記用具  ")})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if item.Note == nil || *item.Note != "持ち物: 筆記用具" {
		t.Fatalf("Note = %v, want 前後の空白を除いた備考", item.Note)
	}

	updated, err := s.Update(t.Context(), userID, item.ID, Fields{SetNote: true})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Note != nil {
		t.Fatalf("Note = %v, want 備考を消した状態", *updated.Note)
	}
}

func TestEventSpanRules(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool)
	intern := db.CalendarEventTypeIntern

	item, err := s.Create(t.Context(), userID, Fields{Title: ptr("夏インターン"), Type: &intern, Date: day("2026-10-30"), EndDate: day("2026-11-02")})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if item.EndDate == nil || item.EndDate.Format(time.DateOnly) != "2026-11-02" {
		t.Fatalf("EndDate = %v, want 2026-11-02", item.EndDate)
	}

	// 期間に少しでも重なれば、絞り込んだ一覧に入る
	items, err := s.List(t.Context(), userID, day("2026-11-01"), day("2026-11-30"))
	if err != nil || len(items) != 1 {
		t.Fatalf("List = %v, %v, want 期間の重なる1件", items, err)
	}

	_, err = s.Create(t.Context(), userID, Fields{Title: ptr("逆"), Date: day("2026-11-05"), EndDate: day("2026-11-01")})
	assertKind(t, err, platform.KindInvalid)
	_, err = s.Create(t.Context(), userID, Fields{Title: ptr("時刻つき"), Date: day("2026-11-05"), EndDate: day("2026-11-06"), Time: ptr("10:00")})
	assertKind(t, err, platform.KindInvalid)

	// 更新後の値で確かめる: 初日だけを最終日より後にはできない
	_, err = s.Update(t.Context(), userID, item.ID, Fields{Date: day("2026-11-10")})
	assertKind(t, err, platform.KindInvalid)

	// 最終日を初日と同じにすると、1日だけの予定になる
	oneDay, err := s.Update(t.Context(), userID, item.ID, Fields{SetEndDate: true, EndDate: day("2026-10-30")})
	if err != nil || oneDay.EndDate != nil {
		t.Fatalf("Update = %+v, %v, want 1日だけの予定", oneDay, err)
	}
}
