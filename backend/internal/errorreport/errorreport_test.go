package errorreport

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

type received struct {
	path    string
	payload string
}

// newErrorReportingServer は、Error Reporting の代わりに受け取った内容を記録するサーバー。status を返す。
func newErrorReportingServer(t *testing.T, status int) (*Reporter, *[]received) {
	t.Helper()
	var got []received
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		got = append(got, received{path: r.URL.Path, payload: string(body)})
		w.WriteHeader(status)
	}))
	t.Cleanup(srv.Close)
	return &Reporter{client: srv.Client(), endpoint: srv.URL, projectID: "test-project", service: "backend", version: "abc123"}, &got
}

// serve は、利用者の秘密の値を本文・クエリ・ヘッダーに載せたリクエストを、エラーを返す handler に送る。
func serve(reporter platform.ErrorReporter, err error) *httptest.ResponseRecorder {
	h := platform.Chain(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		platform.WriteError(w, r, err)
	}), platform.ReportErrors(reporter), platform.Recover)
	req := httptest.NewRequest(http.MethodPost, "/v1/es-entries?q=query-secret", strings.NewReader(`{"body":"body-secret"}`))
	req.Header.Set("Authorization", "Bearer token-secret")
	req.Header.Set("Cookie", "session=cookie-secret")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestReportsInternalErrorWithoutRequestSecrets(t *testing.T) {
	reporter, got := newErrorReportingServer(t, http.StatusOK)
	serve(reporter, errors.New("db down"))

	if len(*got) != 1 {
		t.Fatalf("received %d events, want 1", len(*got))
	}
	if (*got)[0].path != "/v1beta1/projects/test-project/events:report" {
		t.Errorf("path = %q, want the events:report of the project", (*got)[0].path)
	}
	payload := (*got)[0].payload
	for _, secret := range []string{"query-secret", "body-secret", "token-secret", "cookie-secret"} {
		if strings.Contains(payload, secret) {
			t.Errorf("payload contains %q: %s", secret, payload)
		}
	}
	var event reportedErrorEvent
	if err := json.Unmarshal([]byte(payload), &event); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if event.ServiceContext != (serviceContext{Service: "backend", Version: "abc123"}) {
		t.Errorf("serviceContext = %+v", event.ServiceContext)
	}
	if !strings.HasPrefix(event.Message, "db down\n\ngoroutine ") {
		t.Errorf("message = %q, want the error and a stack trace", event.Message)
	}
	if event.Context.HTTPRequest != (httpRequestContext{Method: http.MethodPost, URL: "/v1/es-entries", ResponseStatusCode: http.StatusInternalServerError}) {
		t.Errorf("httpRequest = %+v", event.Context.HTTPRequest)
	}
	if event.EventTime == "" {
		t.Error("eventTime is empty")
	}
}

func TestDoesNotReportClientErrors(t *testing.T) {
	reporter, got := newErrorReportingServer(t, http.StatusOK)
	serve(reporter, &platform.Error{Kind: platform.KindInvalid, Message: "入力内容に誤りがあります"})

	if len(*got) != 0 {
		t.Errorf("received %d events, want none for a 4xx", len(*got))
	}
}

func TestFailedReportKeepsResponse(t *testing.T) {
	reporter, got := newErrorReportingServer(t, http.StatusForbidden)
	rec := serve(reporter, errors.New("db down"))

	if len(*got) != 1 {
		t.Fatalf("received %d events, want 1", len(*got))
	}
	if err := reporter.Report(t.Context(), platform.UnexpectedError{}); err == nil {
		t.Error("Report returned nil for a 403, want an error")
	}
	if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "internal_error") {
		t.Errorf("response = %d %s, want the usual 500 problem", rec.Code, rec.Body)
	}
}

func TestNewWithoutCredentialsDoesNotReport(t *testing.T) {
	reporter, err := New("", "backend", "")
	if err != nil || reporter != nil {
		t.Errorf("New(\"\") = %v, %v, want nil, nil", reporter, err)
	}
}

func TestNewUsesProjectOfCredentials(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	credentials, err := json.Marshal(map[string]string{
		"type":         "service_account",
		"project_id":   "my-project",
		"private_key":  string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})),
		"client_email": "error-reporter@my-project.iam.gserviceaccount.com",
		"token_uri":    "https://oauth2.googleapis.com/token",
	})
	if err != nil {
		t.Fatal(err)
	}

	reporter, err := New(string(credentials), "backend", "abc123")
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if got := reporter.(*Reporter).projectID; got != "my-project" {
		t.Errorf("projectID = %q, want my-project", got)
	}
}

func TestNewRejectsOtherCredentialTypes(t *testing.T) {
	if _, err := New(`{"type":"authorized_user"}`, "backend", ""); err == nil {
		t.Error("New accepted a non service account credential")
	}
}
