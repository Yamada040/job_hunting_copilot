package interview

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai/aitest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func ptr[T any](v T) *T { return &v }

func date(s string) *time.Time {
	d, _ := time.Parse(time.DateOnly, s)
	return &d
}

type fixture struct {
	pool       *pgxpool.Pool
	interviews *Service
	companies  *company.Service
	ai         *aitest.Fake
}

func setup(t *testing.T) fixture {
	t.Helper()
	pool := dbtest.Connect(t)
	x := xp.NewService()
	fake := &aitest.Fake{Reply: "振り返り結果"}
	return fixture{
		pool:       pool,
		interviews: NewService(pool, x, fake, ratelimit.NewLimiter()),
		companies:  company.NewService(pool, x, nil, nil),
		ai:         fake,
	}
}

func (f fixture) newCompany(t *testing.T, userID uuid.UUID, name string) uuid.UUID {
	t.Helper()
	row, _, err := f.companies.Create(t.Context(), userID, company.Fields{Name: ptr(name)})
	if err != nil {
		t.Fatalf("create company: %v", err)
	}
	return row.ID
}

func validFields(companyID uuid.UUID, day string) Fields {
	return Fields{
		CompanyID:     &companyID,
		Format:        ptr(db.InterviewFormatOnline),
		Round:         ptr("一次"),
		InterviewDate: date(day),
		Questions:     &[]Question{{Question: "自己紹介", Answer: "...", Rating: "good"}},
	}
}

func assertKind(t *testing.T, err error, kind platform.Kind) {
	t.Helper()
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != kind {
		t.Fatalf("error = %v, want kind %v", err, kind)
	}
}

func TestCreateSavesLogAndAwardsXP(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	companyID := f.newCompany(t, userID, "サンプル")

	log, reward, err := f.interviews.Create(t.Context(), userID, validFields(companyID, "2026-10-01"))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if log.CompanyName != "サンプル" || *log.Round != "一次" || len(log.Questions) != 1 || log.Questions[0].Rating != "good" {
		t.Errorf("log = %+v, want it saved with the company and the question", log)
	}
	if reward.Awarded != 20 {
		t.Errorf("reward = %+v, want 20 XP", reward)
	}
}

func TestCreateRequiresAtLeastOneQuestion(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	fields := validFields(f.newCompany(t, userID, "サンプル"), "2026-10-01")
	fields.Questions = &[]Question{{Question: " ", Answer: ""}}

	_, _, err := f.interviews.Create(t.Context(), userID, fields)

	assertKind(t, err, platform.KindInvalid)
}

func TestCreateRejectsOtherUsersCompany(t *testing.T) {
	f := setup(t)
	alice := dbtest.CreateUser(t, f.pool)
	bob := dbtest.CreateUser(t, f.pool)

	_, _, err := f.interviews.Create(t.Context(), bob, validFields(f.newCompany(t, alice, "サンプル"), "2026-10-01"))

	assertKind(t, err, platform.KindInvalid)
}

func TestUpdateChangesOnlyGivenFields(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	log, _, err := f.interviews.Create(t.Context(), userID, validFields(f.newCompany(t, userID, "サンプル"), "2026-10-01"))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	updated, err := f.interviews.Update(t.Context(), userID, log.ID, Fields{Improvement: ptr("結論から話す")})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}

	if updated.Improvement == nil || *updated.Improvement != "結論から話す" || *updated.Round != "一次" || len(updated.Questions) != 1 {
		t.Errorf("log = %+v, want improvement set and the rest kept", updated)
	}
}

func TestListOrdersByInterviewDate(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	companyID := f.newCompany(t, userID, "サンプル")
	for _, day := range []string{"2026-10-01", "2026-10-15", "2026-10-08"} {
		if _, _, err := f.interviews.Create(t.Context(), userID, validFields(companyID, day)); err != nil {
			t.Fatalf("Create: %v", err)
		}
	}

	logs, err := f.interviews.List(t.Context(), userID, nil, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	got := []string{}
	for _, l := range logs {
		got = append(got, l.InterviewDate.Format(time.DateOnly))
	}
	if len(got) != 3 || got[0] != "2026-10-15" || got[2] != "2026-10-01" {
		t.Errorf("dates = %v, want newest first", got)
	}
}

func TestListReturnsWhetherReviewed(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	companyID := f.newCompany(t, userID, "サンプル")
	reviewed, _, err := f.interviews.Create(t.Context(), userID, validFields(companyID, "2026-10-15"))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, _, err := f.interviews.Create(t.Context(), userID, validFields(companyID, "2026-10-01")); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, err := f.interviews.Review(t.Context(), userID, reviewed.ID); err != nil {
		t.Fatalf("Review: %v", err)
	}

	logs, err := f.interviews.List(t.Context(), userID, nil, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(logs) != 2 || !logs[0].Reviewed || logs[1].Reviewed {
		t.Errorf("logs = %+v, want only the newer log reviewed", logs)
	}
}

func TestCreateStopsAtLimitPerUser(t *testing.T) {
	f := setup(t)
	alice := dbtest.CreateUser(t, f.pool)
	bob := dbtest.CreateUser(t, f.pool)
	companyID := f.newCompany(t, alice, "サンプル")
	if _, err := f.pool.Exec(t.Context(),
		`insert into interview_logs (user_id, company_id) select $1, $2 from generate_series(1, $3)`,
		alice, companyID, maxLogs); err != nil {
		t.Fatalf("fill interview logs: %v", err)
	}

	_, _, err := f.interviews.Create(t.Context(), alice, validFields(companyID, "2026-10-01"))
	assertKind(t, err, platform.KindConflict)
	if _, _, err := f.interviews.Create(t.Context(), bob, validFields(f.newCompany(t, bob, "サンプル"), "2026-10-01")); err != nil {
		t.Errorf("Create for another user: %v, want success", err)
	}
}

func TestOtherUsersLogIsNotFound(t *testing.T) {
	f := setup(t)
	alice := dbtest.CreateUser(t, f.pool)
	bob := dbtest.CreateUser(t, f.pool)
	log, _, err := f.interviews.Create(t.Context(), alice, validFields(f.newCompany(t, alice, "サンプル"), "2026-10-01"))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	_, err = f.interviews.Get(t.Context(), bob, log.ID)
	assertKind(t, err, platform.KindNotFound)
	_, err = f.interviews.Update(t.Context(), bob, log.ID, Fields{Round: ptr("二次")})
	assertKind(t, err, platform.KindNotFound)
	err = f.interviews.Delete(t.Context(), bob, log.ID)
	assertKind(t, err, platform.KindNotFound)
}

func TestReviewSendsLogToAIAndSavesResult(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	fields := validFields(f.newCompany(t, userID, "サンプル"), "2026-10-01")
	fields.Improvement = ptr("結論から話す")
	log, _, err := f.interviews.Create(t.Context(), userID, fields)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	reviewed, err := f.interviews.Review(t.Context(), userID, log.ID)
	if err != nil {
		t.Fatalf("Review: %v", err)
	}

	if reviewed.AiResult == nil || *reviewed.AiResult != "振り返り結果" {
		t.Errorf("ai result = %v, want the AI reply saved", reviewed.AiResult)
	}
	for _, want := range []string{"サンプル", "オンライン", "自己紹介", "手応え: 良い", "結論から話す"} {
		if !strings.Contains(f.ai.Inputs[0], want) {
			t.Errorf("AI input %q does not contain %q", f.ai.Inputs[0], want)
		}
	}
}
