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
