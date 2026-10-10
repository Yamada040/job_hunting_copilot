// Package authtest は、テスト用に Supabase Auth の代わりを務める発行者（JWKSの配信とトークンの署名）を提供する。
package authtest

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const keyID = "test-key"

// Issuer は、/auth/v1/.well-known/jwks.json で公開鍵を配る Supabase Auth の偽物。
type Issuer struct {
	URL string
	key *ecdsa.PrivateKey
}

func NewIssuer(t *testing.T) *Issuer {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	jwks := map[string]any{"keys": []map[string]string{{
		"kty": "EC",
		"crv": "P-256",
		"alg": "ES256",
		"use": "sig",
		"kid": keyID,
		"x":   base64.RawURLEncoding.EncodeToString(key.X.FillBytes(make([]byte, 32))),
		"y":   base64.RawURLEncoding.EncodeToString(key.Y.FillBytes(make([]byte, 32))),
	}}}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/v1/.well-known/jwks.json" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(jwks)
	}))
	t.Cleanup(srv.Close)
	return &Issuer{URL: srv.URL, key: key}
}

// Claims は、この発行者が出す正しいトークンの中身を返す。テストでは一部を書き換えて不正なトークンを作る。
func (i *Issuer) Claims(userID string) jwt.RegisteredClaims {
	return jwt.RegisteredClaims{
		Issuer:    i.URL + "/auth/v1",
		Subject:   userID,
		Audience:  jwt.ClaimStrings{"authenticated"},
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}
}

// Sign は、claims を ES256 で署名したトークンを返す。
func (i *Issuer) Sign(t *testing.T, claims jwt.RegisteredClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = keyID
	signed, err := token.SignedString(i.key)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

// SignWithEmail は、claims にメールアドレスを加えたトークンを返す（Supabase Auth のトークンは email を含む）。
func (i *Issuer) SignWithEmail(t *testing.T, claims jwt.RegisteredClaims, email string) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, struct {
		jwt.RegisteredClaims
		Email string `json:"email"`
	}{claims, email})
	token.Header["kid"] = keyID
	signed, err := token.SignedString(i.key)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}
