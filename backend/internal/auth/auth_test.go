package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/golang-jwt/jwt/v5"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth/authtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

func newVerifier(t *testing.T, issuer *authtest.Issuer) *auth.Verifier {
	t.Helper()
	v, err := auth.NewVerifier(t.Context(), issuer.URL)
	if err != nil {
		t.Fatalf("NewVerifier: %v", err)
	}
	return v
}

func TestUserIDAcceptsValidToken(t *testing.T) {
	issuer := authtest.NewIssuer(t)
	v := newVerifier(t, issuer)

	got, err := v.UserID(issuer.Sign(t, issuer.Claims("user-1")))
	if err != nil {
		t.Fatalf("UserID: %v", err)
	}
	if got != "user-1" {
		t.Errorf("UserID = %q, want user-1", got)
	}
}

func TestUserIDRejectsInvalidTokens(t *testing.T) {
	issuer := authtest.NewIssuer(t)
	v := newVerifier(t, issuer)
	otherIssuer := authtest.NewIssuer(t)

	cases := map[string]string{
		"expired": issuer.Sign(t, func() jwt.RegisteredClaims {
			c := issuer.Claims("user-1")
			c.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Minute))
			return c
		}()),
		"wrong audience": issuer.Sign(t, func() jwt.RegisteredClaims {
			c := issuer.Claims("user-1")
			c.Audience = jwt.ClaimStrings{"anon"}
			return c
		}()),
		"wrong issuer": issuer.Sign(t, func() jwt.RegisteredClaims {
			c := issuer.Claims("user-1")
			c.Issuer = "https://evil.example.com/auth/v1"
			return c
		}()),
		"no subject":            issuer.Sign(t, issuer.Claims("")),
		"signed by another key": otherIssuer.Sign(t, issuer.Claims("user-1")),
		"not a jwt":             "garbage",
	}
	for name, token := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := v.UserID(token); err == nil {
				t.Error("UserID succeeded, want an error")
			}
		})
	}
}

func TestUserIDRejectsSharedSecretToken(t *testing.T) {
	issuer := authtest.NewIssuer(t)
	v := newVerifier(t, issuer)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, issuer.Claims("user-1")).SignedString([]byte("legacy-secret"))
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	if _, err := v.UserID(token); err == nil {
		t.Error("UserID accepted an HS256 token, want only asymmetric algorithms")
	}
}

// 公開APIと、ログインが必要なAPIを1つずつ持つ仕様
const spec = `
openapi: 3.0.3
info: {title: test, version: "1"}
security:
  - bearerAuth: []
paths:
  /public:
    get:
      security: []
      responses: {"200": {description: ok}}
  /private:
    get:
      responses: {"200": {description: ok}}
components:
  securitySchemes:
    bearerAuth: {type: http, scheme: bearer}
`

func serve(t *testing.T, issuer *authtest.Issuer, path, token string) (*httptest.ResponseRecorder, string) {
	t.Helper()
	doc, err := openapi3.NewLoader().LoadFromData([]byte(spec))
	if err != nil {
		t.Fatalf("load spec: %v", err)
	}
	var seenUser string
	h := platform.Chain(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenUser, _ = auth.UserID(r.Context())
	}), newVerifier(t, issuer).Authenticate, platform.Validate(doc, auth.RequireUser))

	req := httptest.NewRequest(http.MethodGet, path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec, seenUser
}

func TestPrivateAPIPassesUserIDWithValidToken(t *testing.T) {
	issuer := authtest.NewIssuer(t)

	rec, user := serve(t, issuer, "/private", issuer.Sign(t, issuer.Claims("user-1")))

	if rec.Code != http.StatusOK || user != "user-1" {
		t.Errorf("got status %d user %q, want 200 user-1", rec.Code, user)
	}
}

func TestPrivateAPIRejectsMissingToken(t *testing.T) {
	issuer := authtest.NewIssuer(t)

	rec, _ := serve(t, issuer, "/private", "")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}

func TestInvalidTokenIsRejectedEvenOnPublicAPI(t *testing.T) {
	issuer := authtest.NewIssuer(t)

	rec, _ := serve(t, issuer, "/public", "garbage")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}

func TestPublicAPIAllowsMissingToken(t *testing.T) {
	issuer := authtest.NewIssuer(t)

	rec, user := serve(t, issuer, "/public", "")

	if rec.Code != http.StatusOK || user != "" {
		t.Errorf("got status %d user %q, want 200 without user", rec.Code, user)
	}
}
