package es

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
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit/ratelimittest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

func ptr[T any](v T) *T { return &v }

type fixture struct {
	pool      *pgxpool.Pool
	es        *Service
	companies *company.Service
	ai        *aitest.Fake
}

func setup(t *testing.T) fixture {
	t.Helper()
	pool := dbtest.Connect(t)
	x := xp.NewService()
	fake := &aitest.Fake{Reply: "添削結果"}
	return fixture{
		pool:      pool,
		es:        NewService(pool, x, fake, ratelimittest.NewLimiter()),
		companies: company.NewService(pool, x, nil, nil),
		ai:        fake,
	}
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

func TestCreateStopsAtLimitPerUser(t *testing.T) {
	f := setup(t)
	alice := dbtest.CreateUser(t, f.pool)
	bob := dbtest.CreateUser(t, f.pool)
	companyID := f.company(t, alice, "サンプル")
	if _, err := f.pool.Exec(t.Context(),
		`insert into es_entries (user_id, company_id, title) select $1, $2, 'ES' || n from generate_series(1, $3) as n`,
		alice, companyID, maxEntries); err != nil {
		t.Fatalf("fill es entries: %v", err)
	}

	_, err := f.es.Create(t.Context(), alice, Fields{CompanyID: &companyID, Title: ptr("上限を超えるES")})
	assertKind(t, err, platform.KindConflict)
	f.entry(t, bob, f.company(t, bob, "サンプル"), "別のユーザーのES")
}

func TestListReviewsReturnsOnlyRecentHistory(t *testing.T) {
	f := setup(t)
	f.ai.Reply = oneItemReply
	userID := dbtest.CreateUser(t, f.pool)
	companyID := f.company(t, userID, "サンプル")
	e, err := f.es.Create(t.Context(), userID, Fields{CompanyID: &companyID, Title: ptr("ES"), Questions: &[]Question{{Prompt: "志望動機", Answer: "回答"}}})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	var latest Review
	for range reviewHistoryLimit + 1 {
		if latest, err = f.es.Review(t.Context(), userID, e.ID); err != nil {
			t.Fatalf("Review: %v", err)
		}
	}

	reviews, err := f.es.ListReviews(t.Context(), userID, e.ID)
	if err != nil || len(reviews) != reviewHistoryLimit || reviews[0].ID != latest.ID {
		t.Errorf("reviews = %d, %v; want the newest %d reviews", len(reviews), err, reviewHistoryLimit)
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

// oneItemReply は、項目が1つのESに対するAIの返答。
const oneItemReply = `{"summary":"全体の講評","items":[{
	"structure":{"score":7,"comment":"結論が先"},
	"specificity":{"score":5,"comment":"数字が無い"},
	"companyFit":{"score":null,"comment":"情報不足：企業分析"},
	"improvement":"改善点","rewrite":"修正版"}]}`

func TestReviewSendsSavedContentWithCharRangeAndKeepsHistory(t *testing.T) {
	f := setup(t)
	f.ai.Reply = oneItemReply
	userID := dbtest.CreateUser(t, f.pool)
	companyID := f.company(t, userID, "サンプル")
	e, err := f.es.Create(t.Context(), userID, Fields{
		CompanyID: &companyID, Title: ptr("本選考ES"),
		Questions: &[]Question{
			{Prompt: "志望動機", Answer: "貴社の事業に惹かれた", CharLimit: ptr(400)},
			{Prompt: "まだ書いていない設問", Answer: ""},
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	first, err := f.es.Review(t.Context(), userID, e.ID)
	if err != nil {
		t.Fatalf("Review: %v", err)
	}
	second, err := f.es.Review(t.Context(), userID, e.ID)
	if err != nil {
		t.Fatalf("second Review: %v", err)
	}

	item := first.Result.Items[0]
	if len(first.Result.Items) != 1 || *item.Prompt != "志望動機" || *item.CharLimit != 400 || item.Rewrite != "修正版" || *item.Structure.Value != 7 {
		t.Errorf("items = %+v, want the answered question merged with the AI reply", first.Result.Items)
	}
	input := f.ai.Inputs[0]
	for _, want := range []string{"サンプル", "志望動機", "貴社の事業に惹かれた", "360〜400字"} {
		if !strings.Contains(input, want) {
			t.Errorf("AI input %q does not contain %q", input, want)
		}
	}
	if strings.Contains(input, "まだ書いていない設問") {
		t.Errorf("AI input %q contains a question without an answer", input)
	}
	if first.Result.UsedCompanyAnalysis || first.Result.UsedSelfAnalysis {
		t.Errorf("result = %+v, want no analyses used before any analysis is saved", first.Result)
	}
	reviews, err := f.es.ListReviews(t.Context(), userID, e.ID)
	if err != nil || len(reviews) != 2 || reviews[0].ID != second.ID {
		t.Errorf("reviews = %d, %v; want both reviews, newest first", len(reviews), err)
	}
}

func TestReviewPassesCompanyAndSelfAnalysisResults(t *testing.T) {
	f := setup(t)
	f.ai.Reply = oneItemReply
	userID := dbtest.CreateUser(t, f.pool)
	other := dbtest.CreateUser(t, f.pool)
	companyID := f.company(t, userID, "サンプル")
	q := db.New(f.pool)
	if _, err := q.SetCompanyAiResultOnce(t.Context(), db.SetCompanyAiResultOnceParams{ID: companyID, UserID: userID, AiResult: ptr("求める人物像：挑戦する人")}); err != nil {
		t.Fatalf("set company analysis: %v", err)
	}
	for _, id := range []uuid.UUID{userID, other} {
		if _, err := q.CreateSelfAnalysisResult(t.Context(), db.CreateSelfAnalysisResultParams{UserID: id, Answers: []byte(`{}`)}); err != nil {
			t.Fatalf("create self analysis: %v", err)
		}
		if _, err := q.SetSelfAnalysisAiResultOnce(t.Context(), db.SetSelfAnalysisAiResultOnceParams{UserID: id, AiResult: ptr("強み：粘り強さ（" + id.String() + "）")}); err != nil {
			t.Fatalf("set self analysis: %v", err)
		}
	}
	e, err := f.es.Create(t.Context(), userID, Fields{
		CompanyID: &companyID, Title: ptr("ES"), Questions: &[]Question{{Prompt: "志望動機", Answer: "回答"}},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	review, err := f.es.Review(t.Context(), userID, e.ID)
	if err != nil {
		t.Fatalf("Review: %v", err)
	}

	input := f.ai.Inputs[0]
	for _, want := range []string{"求める人物像：挑戦する人", "強み：粘り強さ（" + userID.String() + "）"} {
		if !strings.Contains(input, want) {
			t.Errorf("AI input %q does not contain %q", input, want)
		}
	}
	if strings.Contains(input, other.String()) {
		t.Errorf("AI input %q contains another user's self analysis", input)
	}
	if !review.Result.UsedCompanyAnalysis || !review.Result.UsedSelfAnalysis {
		t.Errorf("result = %+v, want both analyses marked as used", review.Result)
	}
}

func TestReviewRejectsAIResultWithWrongItemCount(t *testing.T) {
	f := setup(t)
	f.ai.Reply = `{"summary":"講評","items":[]}`
	userID := dbtest.CreateUser(t, f.pool)
	companyID := f.company(t, userID, "サンプル")
	e, err := f.es.Create(t.Context(), userID, Fields{
		CompanyID: &companyID, Title: ptr("ES"), Questions: &[]Question{{Prompt: "志望動機", Answer: "回答"}},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	_, err = f.es.Review(t.Context(), userID, e.ID)

	assertKind(t, err, platform.KindUnavailable)
	if reviews, _ := f.es.ListReviews(t.Context(), userID, e.ID); len(reviews) != 0 {
		t.Errorf("reviews = %d, want the broken result not saved", len(reviews))
	}
}

func TestOtherUsersReviewsAreNotFound(t *testing.T) {
	f := setup(t)
	f.ai.Reply = oneItemReply
	alice := dbtest.CreateUser(t, f.pool)
	bob := dbtest.CreateUser(t, f.pool)
	companyID := f.company(t, alice, "サンプル")
	e, err := f.es.Create(t.Context(), alice, Fields{
		CompanyID: &companyID, Title: ptr("ES"), Questions: &[]Question{{Prompt: "志望動機", Answer: "回答"}},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, err := f.es.Review(t.Context(), alice, e.ID); err != nil {
		t.Fatalf("Review: %v", err)
	}

	_, err = f.es.ListReviews(t.Context(), bob, e.ID)
	assertKind(t, err, platform.KindNotFound)
	_, err = f.es.Review(t.Context(), bob, e.ID)
	assertKind(t, err, platform.KindNotFound)
}

func TestOverallScoreAveragesScoresExceptMissing(t *testing.T) {
	r := ReviewResult{Items: []ReviewItem{
		{Structure: Score{Value: ptr(7)}, Specificity: Score{Value: ptr(5)}, CompanyFit: Score{}},
		{Structure: Score{Value: ptr(8)}, Specificity: Score{}, CompanyFit: Score{}},
	}}

	if got := r.OverallScore(); got == nil || *got != 6.7 {
		t.Errorf("overall = %v, want 6.7 (20 / 3, rounded)", got)
	}
	if got := (ReviewResult{Items: []ReviewItem{{}}}).OverallScore(); got != nil {
		t.Errorf("overall = %v, want nil when nothing is scored", *got)
	}
}

func TestReviewRejectsEntryWithoutContent(t *testing.T) {
	f := setup(t)
	userID := dbtest.CreateUser(t, f.pool)
	e := f.entry(t, userID, f.company(t, userID, "サンプル"), "ES")

	_, err := f.es.Review(t.Context(), userID, e.ID)

	assertKind(t, err, platform.KindInvalid)
	if len(f.ai.Inputs) != 0 {
		t.Error("AI was called for an empty ES")
	}
}
