package companyoverview

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/calendar"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/es"
)

type fakeCompanies struct {
	rows []db.Company
}

func (f fakeCompanies) List(_ context.Context, _ uuid.UUID, _ string) ([]db.Company, error) {
	return f.rows, nil
}

func (f fakeCompanies) Get(_ context.Context, _ uuid.UUID, id uuid.UUID) (db.Company, error) {
	for _, row := range f.rows {
		if row.ID == id {
			return row, nil
		}
	}
	return db.Company{}, nil
}

type fakeES struct {
	entries []es.Entry
	company uuid.UUID
}

func (f *fakeES) List(_ context.Context, _ uuid.UUID, companyID *uuid.UUID, _ int) ([]es.Entry, error) {
	if companyID != nil {
		f.company = *companyID
	}
	return f.entries, nil
}

type fakeCalendar struct {
	items []calendar.Item
	from  *time.Time
}

func (f *fakeCalendar) List(_ context.Context, _ uuid.UUID, from, _ *time.Time) ([]calendar.Item, error) {
	f.from = from
	return f.items, nil
}

func TestGetByNameCombinesCompanyESAndUpcomingItems(t *testing.T) {
	userID := uuid.New()
	companyID := uuid.New()
	otherCompanyID := uuid.New()
	esID := uuid.New()
	deadline := time.Date(2026, time.October, 22, 0, 0, 0, 0, time.UTC)
	content := "研究での課題解決について書いた"
	companies := fakeCompanies{rows: []db.Company{{
		ID: companyID, UserID: userID, Name: "株式会社サンプル", Stage: db.CompanyStageInterviewing, UpdatedAt: time.Date(2026, time.October, 10, 9, 0, 0, 0, time.UTC),
	}}}
	esReader := &fakeES{entries: []es.Entry{{
		EsEntry:   db.EsEntry{ID: esID, CompanyID: companyID, Title: ptr("ガクチカ"), Status: db.EsStatusDraft, Deadline: &deadline, ContentMd: &content, UpdatedAt: time.Date(2026, time.October, 11, 9, 0, 0, 0, time.UTC)},
		Questions: []es.Question{{Prompt: "学生時代に力を入れたこと", Answer: "研究"}},
	}}}
	calendarReader := &fakeCalendar{items: []calendar.Item{
		{ID: uuid.New(), Source: calendar.SourceEvent, Title: "一次面接", Type: db.CalendarEventTypeInterview, Date: time.Date(2026, time.October, 21, 0, 0, 0, 0, time.UTC), CompanyID: &companyID},
		{ID: uuid.New(), Source: calendar.SourceEvent, Title: "別企業の面接", Type: db.CalendarEventTypeInterview, Date: time.Date(2026, time.October, 20, 0, 0, 0, 0, time.UTC), CompanyID: &otherCompanyID},
	}}
	service := NewService(companies, esReader, calendarReader)
	service.now = func() time.Time { return time.Date(2026, time.October, 16, 16, 0, 0, 0, time.UTC) }

	got, err := service.GetByName(t.Context(), userID, " 株式会社 サンプル ")
	if err != nil {
		t.Fatalf("GetByName: %v", err)
	}
	if got.Company.ID != companyID.String() || got.Company.Stage != string(db.CompanyStageInterviewing) {
		t.Errorf("company = %+v", got.Company)
	}
	if esReader.company != companyID {
		t.Errorf("ES companyID = %s, want %s", esReader.company, companyID)
	}
	if len(got.ES) != 1 || got.ES[0].ContentMD == nil || *got.ES[0].ContentMD != content || got.ES[0].Questions[0].Answer != "研究" {
		t.Errorf("ES = %+v", got.ES)
	}
	if len(got.Upcoming) != 1 || got.Upcoming[0].Title != "一次面接" {
		t.Errorf("upcoming = %+v", got.Upcoming)
	}
	if calendarReader.from == nil || calendarReader.from.Format(time.DateOnly) != "2026-10-17" {
		t.Errorf("from = %v, want 2026-10-17 in JST", calendarReader.from)
	}
}

func ptr(value string) *string { return &value }
