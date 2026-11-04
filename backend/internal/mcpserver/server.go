// Package mcpserver は、就活copilotの読み取り専用MCPツールを公開する。
package mcpserver

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	mcpauth "github.com/modelcontextprotocol/go-sdk/auth"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/modelcontextprotocol/go-sdk/oauthex"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/companyoverview"
)

const serverVersion = "0.1.0"

const protectedResourceMetadataPath = "/.well-known/oauth-protected-resource/mcp"

// OAuthConfig は、MCPリソースサーバーがOAuthクライアントへ返す公開設定。
type OAuthConfig struct {
	ResourceURL            string
	AuthorizationServerURL string
}

// NewOAuthConfig は、公開サイトとSupabase AuthのURLからMCP向けOAuth設定を作る。
func NewOAuthConfig(siteURL, supabaseURL string) (OAuthConfig, error) {
	site, err := absoluteURL(siteURL)
	if err != nil {
		return OAuthConfig{}, fmt.Errorf("site URL: %w", err)
	}
	supabase, err := absoluteURL(supabaseURL)
	if err != nil {
		return OAuthConfig{}, fmt.Errorf("supabase URL: %w", err)
	}
	return OAuthConfig{
		ResourceURL:            strings.TrimRight(site, "/") + "/mcp",
		AuthorizationServerURL: strings.TrimRight(supabase, "/") + "/auth/v1",
	}, nil
}

func absoluteURL(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return "", fmt.Errorf("must be an absolute URL")
	}
	if u.RawQuery != "" || u.Fragment != "" {
		return "", fmt.Errorf("must not include a query or fragment")
	}
	return strings.TrimRight(u.String(), "/"), nil
}

// ProtectedResourceMetadataURL は、OAuthクライアントが認可サーバーを発見する公開URL。
func (c OAuthConfig) ProtectedResourceMetadataURL() string {
	u, err := url.Parse(c.ResourceURL)
	if err != nil {
		return ""
	}
	return u.Scheme + "://" + u.Host + protectedResourceMetadataPath
}

// ProtectedResourceMetadataHandler は、RFC 9728 のOAuth Protected Resource Metadataを返す。
func ProtectedResourceMetadataHandler(config OAuthConfig) http.Handler {
	return mcpauth.ProtectedResourceMetadataHandler(&oauthex.ProtectedResourceMetadata{
		Resource:               config.ResourceURL,
		AuthorizationServers:   []string{config.AuthorizationServerURL},
		ScopesSupported:        []string{"openid"},
		BearerMethodsSupported: []string{"header"},
		ResourceName:           "Job Seeker MCP",
	})
}

// GetCompanyOverviewInput は、企業overviewの取得条件。
type GetCompanyOverviewInput struct {
	CompanyName string `json:"companyName" jsonschema:"取得する企業の名前。登録済みの企業名を入力する"`
}

// NewHandler は、OAuth 2.1のBearerトークンを検証するStreamable HTTPのMCPハンドラーを作る。
// Supabase OAuthのclient_idを持つトークンだけを受け入れ、リクエストごとに本人のデータだけを扱う。
func NewHandler(overviews *companyoverview.Service, verifier *auth.Verifier, config OAuthConfig) http.Handler {
	handler := mcp.NewStreamableHTTPHandler(func(r *http.Request) *mcp.Server {
		tokenInfo := mcpauth.TokenInfoFromContext(r.Context())
		if tokenInfo == nil || overviews == nil {
			return nil
		}
		userID, err := uuid.Parse(tokenInfo.UserID)
		if err != nil {
			return nil
		}
		return newServer(overviews, userID)
	}, &mcp.StreamableHTTPOptions{
		Stateless:                    true,
		JSONResponse:                 true,
		PropagateRequestCancellation: true,
	})
	protected := mcpauth.RequireBearerToken(func(ctx context.Context, token string, _ *http.Request) (*mcpauth.TokenInfo, error) {
		if verifier == nil {
			return nil, fmt.Errorf("MCP token verifier is not configured")
		}
		user, err := verifier.User(token)
		if err != nil || user.ClientID == "" {
			return nil, mcpauth.ErrInvalidToken
		}
		return &mcpauth.TokenInfo{Expiration: user.ExpiresAt, UserID: user.ID.String()}, nil
	}, &mcpauth.RequireBearerTokenOptions{
		ResourceMetadataURL: config.ProtectedResourceMetadataURL(),
	})
	return http.NewCrossOriginProtection().Handler(protected(handler))
}

func newServer(overviews *companyoverview.Service, userID uuid.UUID) *mcp.Server {
	server := mcp.NewServer(&mcp.Implementation{Name: "job-seeker", Version: serverVersion}, nil)
	mcp.AddTool(server, &mcp.Tool{
		Name:  "get_company_overview",
		Title: "企業の選考状況・ES・予定を確認",
		Description: "登録済み企業について、選考状況、ESで書いた内容、今日以降の予定とES締切を取得する。" +
			"予定がないときはupcomingは空配列になる。データは接続中の本人のものだけを返す。",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, input GetCompanyOverviewInput) (*mcp.CallToolResult, companyoverview.Overview, error) {
		overview, err := overviews.GetByName(ctx, userID, input.CompanyName)
		return nil, overview, err
	})
	return server
}
