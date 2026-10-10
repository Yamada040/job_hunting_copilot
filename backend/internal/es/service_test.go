package es

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func ptr[T any](v T) *T { return &v }

type fixture struct {
	pool      *pgxpool.Pool
	es        *Service
	companies *company.Service
}

func setup(t *testing.T) fixture {
	t.Helper()
	pool := dbtest.Connect(t)
	x := xp.NewService()
	return fixture{pool: pool, es: NewService(pool, x), companies: company.NewService(pool, x)}
}

func (f fixture) company(t *testing.T, userID uuid.UUID, name string) uuid.UUID {
	t.Helper()
	row, _, err := f.companies.Create(t.Context(), userID, company.Fields{Name: ptr(name)})
	if err != nil {
		t.Fatalf("create company: %v", err)
	}
	return row.ID
}

func (f fixture) entry(t *testing.T, userID, companyID uuid.UUID, title string) Entry {
	t.Helper()
	e, err := f.es.Create(t.Context(), userID, Fields{CompanyID: &companyID, Title: ptr(title)})
	if err != nil {
		t.Fatalf("create es: %v", err)
	}
	return e
}

func assertKind(t *testing.T, err error, kind platform.Kind) {
	t.Helper()
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != kind {
		t.Fatalf("error = %v, want kind %v", err, kind)
	}
}

func TestCreateSavesDraftWithCleanedInput(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	companyID := f.company(t, userID, "サンプル")

	e, err := f.es.Create(t.Context(), userID, Fields{
		CompanyID: &companyID,
		Title:     ptr(" 本選考ES "),
		Questions: &[]Question{{Prompt: " 志望動機 ", Answer: "回答"}, {Prompt: " ", Answer: ""}},
		Tags:      &[]string{"IT", " IT ", ""},
		Deadline:  ptr(time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)),
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if e.Status != db.EsStatusDraft || *e.Title != "本選考ES" || e.CompanyName != "サンプル" {
		t.Errorf("entry = %+v, want a trimmed draft linked to the company", e)
	}
	if len(e.Questions) != 1 || e.Questions[0].Prompt != "志望動機" {
		t.Errorf("questions = %+v, want only the non-empty, trimmed question", e.Questions)
	}
	if len(e.Tags) != 1 || e.Tags[0] != "IT" {
		t.Errorf("tags = %v, want duplicates and blanks removed", e.Tags)
	}
	if e.Deadline == nil || e.Deadline.Format(time.DateOnly) != "2026-11-01" {
		t.Errorf("deadline = %v, want 2026-11-01", e.Deadline)
	}
}

func TestCreateRejectsOtherUsersCompany(t *testing.T) {
	f := setup(t)
	alice := dbtest.CreateUser(t, f.pool)
	bob := dbtest.CreateUser(t, f.pool)
	alicesCompany := f.company(t, alice, "サンプル")

	_, err := f.es.Create(t.Context(), bob, Fields{CompanyID: &alicesCompany, Title: ptr("ES")})

	assertKind(t, err, platform.KindInvalid)
}

func TestUpdateChangesOnlyGivenFieldsAndClearsDeadline(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	companyID := f.company(t, userID, "サンプル")
	e, err := f.es.Create(t.Context(), userID, Fields{
		CompanyID: &companyID, Title: ptr("ES"), Memo: ptr("メモ"),
		Deadline: ptr(time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)),
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	updated, err := f.es.Update(t.Context(), userID, e.ID, Fields{ContentMd: ptr("本文"), SetDeadline: true})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}

	if updated.ContentMd == nil || *updated.ContentMd != "本文" || updated.Deadline != nil {
		t.Errorf("entry = %+v, want content set and deadline cleared", updated)
	}
	if *updated.Title != "ES" || updated.Memo == nil || *updated.Memo != "メモ" {
		t.Errorf("entry = %+v, want title and memo kept", updated)
	}
}

func TestSubmitAwardsXPOnlyOnce(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	e := f.entry(t, userID, f.company(t, userID, "サンプル"), "ES")

	submitted, first, err := f.es.Submit(t.Context(), userID, e.ID)
	if err != nil {
		t.Fatalf("Submit: %v", err)
	}
	_, second, err := f.es.Submit(t.Context(), userID, e.ID)
	if err != nil {
		t.Fatalf("second Submit: %v", err)
	}

	if submitted.Status != db.EsStatusSubmitted {
		t.Errorf("status = %s, want submitted", submitted.Status)
	}
	if first.Awarded != 25 || second.Awarded != 0 {
		t.Errorf("awarded %d then %d, want 25 then 0", first.Awarded, second.Awarded)
	}
}

func TestListFiltersByCompanyAndLimits(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	a := f.company(t, userID, "A社")
	b := f.company(t, userID, "B社")
	f.entry(t, userID, a, "A1")
	f.entry(t, userID, a, "A2")
	f.entry(t, userID, b, "B1")

	byCompany, err := f.es.List(t.Context(), userID, &a, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	limited, err := f.es.List(t.Context(), userID, nil, 2)
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	if len(byCompany) != 2 || byCompany[0].CompanyName != "A社" {
		t.Errorf("by company = %d entries, want 2 entries of A社", len(byCompany))
	}
	if len(limited) != 2 {
		t.Errorf("limited = %d entries, want 2", len(limited))
	}
}

func TestOtherUsersEntryIsNotFound(t *testing.T) {
	f := setup(t)
	alice := dbtest.CreateUser(t, f.pool)
	bob := dbtest.CreateUser(t, f.pool)
	e := f.entry(t, alice, f.company(t, alice, "サンプル"), "ES")

	_, err := f.es.Get(t.Context(), bob, e.ID)
	assertKind(t, err, platform.KindNotFound)
	_, err = f.es.Update(t.Context(), bob, e.ID, Fields{Title: ptr("書き換え")})
	assertKind(t, err, platform.KindNotFound)
	_, _, err = f.es.Submit(t.Context(), bob, e.ID)
	assertKind(t, err, platform.KindNotFound)
	err = f.es.Delete(t.Context(), bob, e.ID)
	assertKind(t, err, platform.KindNotFound)

	list, err := f.es.List(t.Context(), bob, nil, 0)
	if err != nil || len(list) != 0 {
		t.Errorf("bob's list = %d entries, %v; want none", len(list), err)
	}
}
