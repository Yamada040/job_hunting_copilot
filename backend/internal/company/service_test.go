package company

import (
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai/aitest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit/ratelimittest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func ptr[T any](v T) *T { return &v }

func setup(t *testing.T) (*pgxpool.Pool, *Service, uuid.UUID) {
	t.Helper()
	pool := dbtest.Connect(t)
	return pool, NewService(pool, xp.NewService(), nil, nil), dbtest.CreateUser(t, pool)
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

func TestListReturnsOnlyHeadOfAnalysisResult(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	s := NewService(pool, xp.NewService(), &aitest.Fake{Reply: strings.Repeat("分", 300)}, ratelimittest.NewLimiter())
	analyzed := create(t, s, userID, "分析済み")
	create(t, s, userID, "未分析")
	if _, err := s.Analyze(t.Context(), userID, analyzed.ID); err != nil {
		t.Fatalf("Analyze: %v", err)
	}

	rows, err := s.List(t.Context(), userID, "")
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	previews := map[string]string{}
	for _, row := range rows {
		previews[row.Name] = row.AiResultPreview
	}
	if previews["分析済み"] != strings.Repeat("分", 200) || previews["未分析"] != "" {
		t.Errorf("previews = %v, want the first 200 characters only for the analyzed company", previews)
	}
}

func TestCreateStopsAtLimitPerUser(t *testing.T) {
	pool, s, alice := setup(t)
	bob := dbtest.CreateUser(t, pool)
	if _, err := pool.Exec(t.Context(),
		`insert into companies (user_id, name, normalized_name) select $1, '企業' || n, '企業' || n from generate_series(1, $2) as n`,
		alice, maxCompanies); err != nil {
		t.Fatalf("fill companies: %v", err)
	}

	_, _, err := s.Create(t.Context(), alice, Fields{Name: ptr("上限を超える企業")})
	assertKind(t, err, platform.KindConflict)
	if _, _, err := s.Create(t.Context(), bob, Fields{Name: ptr("上限を超える企業")}); err != nil {
		t.Errorf("Create for another user: %v, want success", err)
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

func TestAnalyzeRunsOncePerCompanyWithoutPrivateMemo(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	fake := &aitest.Fake{Reply: "分析結果"}
	s := NewService(pool, xp.NewService(), fake, ratelimittest.NewLimiter())
	row, _, err := s.Create(t.Context(), userID, Fields{Name: ptr("サンプル"), Industry: ptr("IT"), Memo: ptr("第一志望・年収重視")})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	analyzed, err := s.Analyze(t.Context(), userID, row.ID)
	if err != nil {
		t.Fatalf("Analyze: %v", err)
	}
	if analyzed.AiResult == nil || *analyzed.AiResult != "分析結果" {
		t.Errorf("ai result = %v, want the AI reply saved", analyzed.AiResult)
	}
	if !strings.Contains(fake.Inputs[0], "サンプル") || strings.Contains(fake.Inputs[0], "年収重視") {
		t.Errorf("AI input = %q, want the company name but not the private memo", fake.Inputs[0])
	}

	_, err = s.Analyze(t.Context(), userID, row.ID)
	assertKind(t, err, platform.KindConflict)
	if len(fake.Inputs) != 1 {
		t.Errorf("AI was called %d times, want once", len(fake.Inputs))
	}
}
