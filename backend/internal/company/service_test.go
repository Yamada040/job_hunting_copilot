package company

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func ptr[T any](v T) *T { return &v }

func setup(t *testing.T) (*pgxpool.Pool, *Service, uuid.UUID) {
	t.Helper()
	pool := dbtest.Connect(t)
	return pool, NewService(pool, xp.NewService()), dbtest.CreateUser(t, pool)
}

func create(t *testing.T, s *Service, userID uuid.UUID, name string) db.Company {
	t.Helper()
	row, _, err := s.Create(t.Context(), userID, Fields{Name: ptr(name)})
	if err != nil {
		t.Fatalf("Create %q: %v", name, err)
	}
	return row
}

func assertKind(t *testing.T, err error, kind platform.Kind) {
	t.Helper()
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != kind {
		t.Fatalf("error = %v, want kind %v", err, kind)
	}
}

func TestCreateSavesCompanyAndAwardsXP(t *testing.T) {
	_, s, userID := setup(t)

	row, reward, err := s.Create(t.Context(), userID, Fields{Name: ptr("  株式会社サンプル "), Industry: ptr(""), Preference: ptr(4)})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if row.Name != "株式会社サンプル" || row.NormalizedName != "サンプル" {
		t.Errorf("name = %q / normalized %q, want trimmed name and normalized name", row.Name, row.NormalizedName)
	}
	if row.Stage != db.CompanyStageNotEntered || row.Industry != nil || *row.Preference != 4 {
		t.Errorf("company = %+v, want default stage, empty industry as null, preference 4", row)
	}
	if reward.Awarded != 5 || reward.Total != 5 {
		t.Errorf("reward = %+v, want 5 XP", reward)
	}
}

func TestCreateRejectsNameVariantOfExistingCompany(t *testing.T) {
	_, s, userID := setup(t)
	create(t, s, userID, "株式会社サンプル")

	_, _, err := s.Create(t.Context(), userID, Fields{Name: ptr("(株)サンプル")})

	assertKind(t, err, platform.KindConflict)
}

func TestCreateAllowsSameNameForDifferentUsers(t *testing.T) {
	pool, s, alice := setup(t)
	bob := dbtest.CreateUser(t, pool)
	create(t, s, alice, "サンプル")

	if _, _, err := s.Create(t.Context(), bob, Fields{Name: ptr("サンプル")}); err != nil {
		t.Errorf("Create for another user: %v, want success", err)
	}
}

func TestCreateRejectsBlankName(t *testing.T) {
	_, s, userID := setup(t)

	_, _, err := s.Create(t.Context(), userID, Fields{Name: ptr("   ")})

	assertKind(t, err, platform.KindInvalid)
}

func TestListFiltersByNormalizedName(t *testing.T) {
	_, s, userID := setup(t)
	create(t, s, userID, "株式会社サンプル商事")
	create(t, s, userID, "別会社")

	rows, err := s.List(t.Context(), userID, "ｻﾝﾌﾟﾙ")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(rows) != 1 || rows[0].Name != "株式会社サンプル商事" {
		t.Errorf("rows = %v, want only the matching company", rows)
	}
}

func TestUpdateChangesOnlyGivenFields(t *testing.T) {
	_, s, userID := setup(t)
	row, _, err := s.Create(t.Context(), userID, Fields{Name: ptr("サンプル"), Memo: ptr("メモ"), Preference: ptr(3)})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	updated, err := s.Update(t.Context(), userID, row.ID, Fields{
		Stage:         ptr(db.CompanyStageInterviewing),
		Favorite:      ptr(true),
		SetPreference: true,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}

	if updated.Stage != db.CompanyStageInterviewing || !updated.Favorite || updated.Preference != nil {
		t.Errorf("company = %+v, want stage, favorite, and cleared preference updated", updated)
	}
	if updated.Name != "サンプル" || updated.Memo == nil || *updated.Memo != "メモ" {
		t.Errorf("company = %+v, want name and memo kept", updated)
	}
}

func TestUpdateRenameRenormalizesAndChecksDuplicates(t *testing.T) {
	_, s, userID := setup(t)
	create(t, s, userID, "サンプル")
	other := create(t, s, userID, "別会社")

	_, err := s.Update(t.Context(), userID, other.ID, Fields{Name: ptr("株式会社サンプル")})

	assertKind(t, err, platform.KindConflict)
}

func TestOtherUsersCompanyIsNotFound(t *testing.T) {
	pool, s, alice := setup(t)
	bob := dbtest.CreateUser(t, pool)
	row := create(t, s, alice, "サンプル")

	_, err := s.Get(t.Context(), bob, row.ID)
	assertKind(t, err, platform.KindNotFound)

	_, err = s.Update(t.Context(), bob, row.ID, Fields{Memo: ptr("書き換え")})
	assertKind(t, err, platform.KindNotFound)

	err = s.Delete(t.Context(), bob, row.ID)
	assertKind(t, err, platform.KindNotFound)

	if got, err := s.Get(t.Context(), alice, row.ID); err != nil || got.Memo != nil {
		t.Errorf("alice's company = %+v, %v; want it untouched", got, err)
	}
}

func TestDeleteRemovesLinkedEntries(t *testing.T) {
	pool, s, userID := setup(t)
	row := create(t, s, userID, "サンプル")
	if _, err := pool.Exec(t.Context(), `insert into es_entries (user_id, company_id, title) values ($1, $2, 'ES')`, userID, row.ID); err != nil {
		t.Fatalf("insert es: %v", err)
	}

	if err := s.Delete(t.Context(), userID, row.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	var count int
	if err := pool.QueryRow(t.Context(), `select count(*) from es_entries where company_id = $1`, row.ID).Scan(&count); err != nil {
		t.Fatalf("count es: %v", err)
	}
	if count != 0 {
		t.Errorf("%d ES remain after deleting the company, want 0", count)
	}
}
