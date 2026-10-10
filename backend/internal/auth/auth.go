// Package auth は、Supabase Auth が発行したアクセストークン（JWT）を検証し、ユーザーIDをリクエストのコンテキストに入れる。
package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// Supabase Auth はログイン済みユーザーのトークンにこの audience を付ける
const audience = "authenticated"

var errNoUser = errors.New("no authenticated user")

// Verifier は、Supabase の公開鍵（JWKS）でトークンの署名・有効期限・発行者・audience を確かめる。
// 共有の秘密鍵や、リクエストごとの Supabase への問い合わせは使わない（docs/backend-design.md 6章）。
type Verifier struct {
	keys   jwt.Keyfunc
	issuer string
}

// NewVerifier は、Supabase のプロジェクトURLから公開鍵を取得する Verifier を作る。
// 公開鍵は裏で定期的に取り直され、未知の鍵IDのトークンが来たときにも取り直される。
func NewVerifier(ctx context.Context, supabaseURL string) (*Verifier, error) {
	base := strings.TrimRight(supabaseURL, "/")
	keys, err := keyfunc.NewDefaultCtx(ctx, []string{base + "/auth/v1/.well-known/jwks.json"})
	if err != nil {
		return nil, fmt.Errorf("load supabase jwks: %w", err)
	}
	return &Verifier{keys: keys.Keyfunc, issuer: base + "/auth/v1"}, nil
}

// UserID は、トークンを検証してユーザーID（sub）を返す。
func (v *Verifier) UserID(token string) (uuid.UUID, error) {
	claims := jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(token, &claims, v.keys,
		jwt.WithValidMethods([]string{"ES256", "RS256"}),
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(audience),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return uuid.Nil, err
	}
	id, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, fmt.Errorf("token subject is not a user id: %w", err)
	}
	return id, nil
}

type userIDKey struct{}

// Authenticate は、Authorization ヘッダーにトークンがあれば検証し、ユーザーIDをコンテキストに入れる。
// トークンが無いリクエストはそのまま通し、ログインが必要かどうかは OpenAPI の security を見る RequireUser に任せる。
// トークンがあるのに不正な場合は、その場で 401 を返す。
func (v *Verifier) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || token == "" {
			next.ServeHTTP(w, r)
			return
		}
		userID, err := v.UserID(token)
		if err != nil {
			platform.Logger(r.Context()).Info("invalid access token", "error", err)
			platform.WriteError(w, r, &platform.Error{Kind: platform.KindUnauthorized, Message: "ログインが必要です"})
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey{}, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserID は、Authenticate が検証したユーザーIDを返す。ログインしていなければ ok は false。
func UserID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey{}).(uuid.UUID)
	return id, ok
}

// RequireUserID は、ログインが必要な操作の handler でユーザーIDを取り出す。
// ログインの確認は RequireUser が先に済ませているので、ここで見つからないのは配線の誤りであり、401 として扱う。
func RequireUserID(ctx context.Context) (uuid.UUID, error) {
	id, ok := UserID(ctx)
	if !ok {
		return uuid.Nil, &platform.Error{Kind: platform.KindUnauthorized, Message: "ログインが必要です"}
	}
	return id, nil
}

// RequireUser は、OpenAPI で bearerAuth が必要とされている操作について、ログイン済みかを確かめる。
// platform.Validate に渡して使う。
func RequireUser(_ context.Context, input *openapi3filter.AuthenticationInput) error {
	if _, ok := UserID(input.RequestValidationInput.Request.Context()); !ok {
		return errNoUser
	}
	return nil
}
