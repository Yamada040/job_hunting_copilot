package mcpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth/authtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/calendar"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/companyoverview"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/es"
)

type testCompanies struct{ company db.Company }

func (t testCompanies) List(_ context.Context, _ uuid.UUID, _ string) ([]db.ListCompaniesRow, error) {
	return []db.ListCompaniesRow{{ID: t.company.ID, Name: t.company.Name}}, nil
}

func (t testCompanies) Get(_ context.Context, _ uuid.UUID, _ uuid.UUID) (db.Company, error) {
	return t.company, nil
}

type testES struct{}

func (testES) List(_ context.Context, _ uuid.UUID, _ *uuid.UUID, _ int) ([]db.ListEsEntriesRow, error) {
	return []db.ListEsEntriesRow{}, nil
}

func (testES) Get(_ context.Context, _ uuid.UUID, _ uuid.UUID) (es.Entry, error) {
	return es.Entry{}, nil
}

type testCalendar struct{}

func (testCalendar) List(_ context.Context, _ uuid.UUID, _ *time.Time, _ *time.Time) ([]calendar.Item, error) {
	return []calendar.Item{}, nil
}

type bearerTransport struct {
	base  http.RoundTripper
	token string
}

func (t bearerTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	copy := r.Clone(r.Context())
	copy.Header.Set("Authorization", "Bearer "+t.token)
	return t.base.RoundTrip(copy)
}

func TestGetCompanyOverviewTool(t *testing.T) {
	issuer := authtest.NewIssuer(t)
	verifier, err := auth.NewVerifier(t.Context(), issuer.URL)
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	userID := uuid.New()
	service := companyoverview.NewService(testCompanies{company: db.Company{
		ID: userID, Name: "サンプル株式会社", Stage: db.CompanyStageScreening, UpdatedAt: time.Now(),
	}}, testES{}, testCalendar{})
	config, err := NewOAuthConfig("https://app.example.com", issuer.URL)
	if err != nil {
		t.Fatalf("NewOAuthConfig: %v", err)
	}
	httpServer := httptest.NewServer(NewHandler(service, verifier, config))
	defer httpServer.Close()

	client := mcp.NewClient(&mcp.Implementation{Name: "test-client", Version: "1.0.0"}, nil)
	session, err := client.Connect(t.Context(), &mcp.StreamableClientTransport{
		Endpoint:             httpServer.URL,
		DisableStandaloneSSE: true,
		HTTPClient: &http.Client{Transport: bearerTransport{
			base: http.DefaultTransport, token: issuer.SignWithClientID(t, issuer.Claims(userID.String()), "mcp-client"),
		}},
	}, nil)
	if err != nil {
		t.Fatalf("Connect: %v", err)
	}
	defer func() {
		if err := session.Close(); err != nil {
			t.Errorf("Close: %v", err)
		}
	}()

	tools, err := session.ListTools(t.Context(), nil)
	if err != nil {
		t.Fatalf("ListTools: %v", err)
	}
	if len(tools.Tools) != 1 || tools.Tools[0].Name != "get_company_overview" {
		t.Fatalf("tools = %+v, want get_company_overview", tools.Tools)
	}
	result, err := session.CallTool(t.Context(), &mcp.CallToolParams{
		Name: "get_company_overview", Arguments: map[string]any{"companyName": "サンプル株式会社"},
	})
	if err != nil {
		t.Fatalf("CallTool: %v", err)
	}
	if result.IsError {
		t.Fatalf("tool returned error: %+v", result.Content)
	}
	structured, ok := result.StructuredContent.(map[string]any)
	if !ok {
		t.Fatalf("structuredContent = %T, want object", result.StructuredContent)
	}
	company, ok := structured["company"].(map[string]any)
	if !ok || company["name"] != "サンプル株式会社" || company["stage"] != "screening" {
		t.Errorf("company = %#v", structured["company"])
	}
}

func TestMCPRejectsBrowserSessionToken(t *testing.T) {
	issuer := authtest.NewIssuer(t)
	verifier, err := auth.NewVerifier(t.Context(), issuer.URL)
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	config, err := NewOAuthConfig("https://app.example.com", issuer.URL)
	if err != nil {
		t.Fatalf("NewOAuthConfig: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/mcp", nil)
	request.Header.Set("Authorization", "Bearer "+issuer.Sign(t, issuer.Claims(uuid.NewString())))
	recorder := httptest.NewRecorder()
	NewHandler(nil, verifier, config).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", recorder.Code)
	}
	if got := recorder.Header().Get("WWW-Authenticate"); got == "" {
		t.Error("WWW-Authenticate is missing")
	}
}
