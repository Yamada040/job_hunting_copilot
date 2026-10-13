package admin

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth/authtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

func loggedIn(t *testing.T, userID uuid.UUID) context.Context {
	t.Helper()
	issuer := authtest.NewIssuer(t)
	v, err := auth.NewVerifier(t.Context(), issuer.URL)
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	var ctx context.Context
	h := v.Authenticate(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { ctx = r.Context() }))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+issuer.Sign(t, issuer.Claims(userID.String())))
	h.ServeHTTP(httptest.NewRecorder(), req)
	return ctx
}

func TestStatsAreOnlyForDevelopers(t *testing.T) {
	pool := dbtest.Connect(t)
	developer := dbtest.CreateUser(t, pool)
	other := dbtest.CreateUser(t, pool)
	h := Handler{Pool: pool, IsDeveloper: func(id uuid.UUID) bool { return id == developer }, Now: time.Now}

	_, err := h.GetAdminStats(loggedIn(t, other), openapi.GetAdminStatsRequestObject{})
	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != platform.KindForbidden {
		t.Fatalf("error = %v, want forbidden for a non-developer", err)
	}

	if _, err := pool.Exec(t.Context(), `insert into profiles (id) values ($1)`, developer); err != nil {
		t.Fatalf("insert profile: %v", err)
	}
	res, err := h.GetAdminStats(loggedIn(t, developer), openapi.GetAdminStatsRequestObject{})
	if err != nil {
		t.Fatalf("GetAdminStats: %v", err)
	}
	stats := res.(openapi.GetAdminStats200JSONResponse)
	if stats.TotalUsers < 1 || stats.NewUsers7d < 1 {
		t.Errorf("stats = %+v, want the developer's own profile counted", stats)
	}
}

func TestStatsIncludeAIUsageOfEveryFeature(t *testing.T) {
	pool := dbtest.Connect(t)
	developer := dbtest.CreateUser(t, pool)
	h := Handler{Pool: pool, IsDeveloper: func(id uuid.UUID) bool { return id == developer }, Now: time.Now}
	// 他のパッケージのテストも同じDBに書き込むので、件数ではなく、ここで入れた大きな値が合計に含まれるかで確かめる
	const inputTokens, outputTokens = 1_000_003, 500_001
	if _, err := pool.Exec(t.Context(),
		`insert into companies (user_id, name, normalized_name, ai_result, ai_input_tokens, ai_output_tokens) values ($1, 'サンプル', 'サンプル', '分析結果', $2, $3)`,
		developer, inputTokens, outputTokens); err != nil {
		t.Fatalf("insert company: %v", err)
	}

	res, err := h.GetAdminStats(loggedIn(t, developer), openapi.GetAdminStatsRequestObject{})
	if err != nil {
		t.Fatalf("GetAdminStats: %v", err)
	}

	usage := res.(openapi.GetAdminStats200JSONResponse).AiUsage
	if len(usage) != len(aiFeatures) {
		t.Fatalf("usage = %+v, want every feature", usage)
	}
	company := usage[2]
	if company.Feature != openapi.AiUsageFeatureCompanyAnalysis || company.Calls < 1 || company.InputTokens < inputTokens || company.OutputTokens < outputTokens {
		t.Errorf("company analysis usage = %+v, want the inserted tokens counted", company)
	}
}

func TestUsageOfUnusedFeatureIsZero(t *testing.T) {
	usage := toAPIUsage([]db.ListAiUsageRow{{Feature: "self_analysis", Calls: 2, InputTokens: 300, OutputTokens: 100}})

	if usage[0] != (openapi.AiUsage{Feature: openapi.AiUsageFeatureEsReview}) {
		t.Errorf("es review usage = %+v, want zero", usage[0])
	}
	if usage[4] != (openapi.AiUsage{Feature: openapi.AiUsageFeatureSelfAnalysis, Calls: 2, InputTokens: 300, OutputTokens: 100}) {
		t.Errorf("self analysis usage = %+v, want the row", usage[4])
	}
}
