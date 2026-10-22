// Package errorreport は、想定外のエラーを Google Cloud の Error Reporting に送る。
//
// 公式の cloud.google.com/go/errorreporting は保守されているが、gRPC・protobuf・OpenTelemetry まで依存に入り、
// Vercel の関数の起動が重くなる。送るのは REST の events:report の1種類だけなので、認証だけを golang.org/x/oauth2 に任せて直接呼ぶ。
package errorreport

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

const (
	defaultEndpoint = "https://clouderrorreporting.googleapis.com"
	// Error Reporting への書き込みに要る最も狭いスコープ（cloud-platform より狭い）
	scope = "https://www.googleapis.com/auth/stackdriver-integration"
	// tokenTimeout は、アクセストークンの取得を待つ上限。トークンの取得は送信の締め切り（platform の reportTimeout）の外で
	// 行われるため、別に上限を付けて、Google の認証が遅いときに応答が長く止まらないようにする
	tokenTimeout = 2 * time.Second
)

// Reporter は、Error Reporting にエラーを送る。
type Reporter struct {
	client    *http.Client
	endpoint  string
	projectID string
	service   string
	version   string
}

// New は、サービスアカウントの鍵（JSON）から Reporter を作る。鍵が空なら、エラーを送らないので nil を返す。
// 送り先のプロジェクトは鍵のプロジェクトを使う。service と version は Error Reporting の画面でエラーを分ける名前と版。
func New(credentialsJSON, service, version string) (platform.ErrorReporter, error) {
	if credentialsJSON == "" {
		return nil, nil
	}
	ctx := context.WithValue(context.Background(), oauth2.HTTPClient, &http.Client{Timeout: tokenTimeout})
	credentials, err := google.CredentialsFromJSONWithType(ctx, []byte(credentialsJSON), google.ServiceAccount, scope)
	if err != nil {
		return nil, fmt.Errorf("parse credentials: %w", err)
	}
	if credentials.ProjectID == "" {
		return nil, fmt.Errorf("credentials have no project_id")
	}
	return &Reporter{
		client:    oauth2.NewClient(ctx, credentials.TokenSource),
		endpoint:  defaultEndpoint,
		projectID: credentials.ProjectID,
		service:   service,
		version:   version,
	}, nil
}

// https://cloud.google.com/error-reporting/reference/rest/v1beta1/projects.events/report の ReportedErrorEvent
type reportedErrorEvent struct {
	EventTime      string         `json:"eventTime"`
	ServiceContext serviceContext `json:"serviceContext"`
	Message        string         `json:"message"`
	Context        errorContext   `json:"context"`
}

type serviceContext struct {
	Service string `json:"service"`
	Version string `json:"version,omitempty"`
}

type errorContext struct {
	HTTPRequest httpRequestContext `json:"httpRequest"`
}

type httpRequestContext struct {
	Method             string `json:"method"`
	URL                string `json:"url"`
	ResponseStatusCode int    `json:"responseStatusCode"`
}

// Report は、e を1件送る。
func (r *Reporter) Report(ctx context.Context, e platform.UnexpectedError) error {
	payload, err := json.Marshal(reportedErrorEvent{
		EventTime:      time.Now().UTC().Format(time.RFC3339Nano),
		ServiceContext: serviceContext{Service: r.service, Version: r.version},
		Message:        e.Message,
		Context: errorContext{HTTPRequest: httpRequestContext{
			Method:             e.Method,
			URL:                e.Path,
			ResponseStatusCode: http.StatusInternalServerError,
		}},
	})
	if err != nil {
		return fmt.Errorf("encode event: %w", err)
	}
	endpoint := r.endpoint + "/v1beta1/projects/" + url.PathEscape(r.projectID) + "/events:report"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("send event: %w", err)
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode/100 != 2 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 1024))
		return fmt.Errorf("error reporting returned %d: %s", res.StatusCode, body)
	}
	return nil
}
