package calendar

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// 購読用URL（iCal）。Googleカレンダーなどが、ログインせずに定期的に読みに来るので、URLの中の秘密のトークンで本人を見分ける。
// トークンは推測できない長さ（32バイト）にし、DBにはハッシュだけを保存する。

// FeedStatus は、購読用URLを作ってあるか。
type FeedStatus struct {
	Enabled   bool
	CreatedAt *time.Time
}

// CreateFeed は、購読用URLのトークンを作る。作ってあれば置き換え、古いURLは使えなくなる。
// 返したトークンは保存していないので、二度と取り出せない。
func (s *Service) CreateFeed(ctx context.Context, userID uuid.UUID) (token string, createdAt time.Time, err error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", time.Time{}, fmt.Errorf("generate feed token: %w", err)
	}
	token = base64.RawURLEncoding.EncodeToString(raw)
	createdAt, err = db.New(s.pool).UpsertCalendarFeed(ctx, db.UpsertCalendarFeedParams{UserID: userID, TokenHash: hashToken(token)})
	if err != nil {
		return "", time.Time{}, fmt.Errorf("upsert calendar feed: %w", err)
	}
	return token, createdAt, nil
}

func (s *Service) FeedStatus(ctx context.Context, userID uuid.UUID) (FeedStatus, error) {
	createdAt, err := db.New(s.pool).GetCalendarFeed(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return FeedStatus{}, nil
	}
	if err != nil {
		return FeedStatus{}, fmt.Errorf("get calendar feed: %w", err)
	}
	return FeedStatus{Enabled: true, CreatedAt: &createdAt}, nil
}

func (s *Service) DeleteFeed(ctx context.Context, userID uuid.UUID) error {
	if err := db.New(s.pool).DeleteCalendarFeed(ctx, userID); err != nil {
		return fmt.Errorf("delete calendar feed: %w", err)
	}
	return nil
}

// FeedItems は、トークンに合うユーザーの予定とESの締切を返す。合わなければ見つからないとして扱う
// （トークンが違うのか止めたのかを、外から見分けられないようにする）。
func (s *Service) FeedItems(ctx context.Context, token string) ([]Item, error) {
	userID, err := db.New(s.pool).GetCalendarFeedUserID(ctx, hashToken(token))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, &platform.Error{Kind: platform.KindNotFound, Message: "カレンダーが見つかりません"}
	}
	if err != nil {
		return nil, fmt.Errorf("get calendar feed user: %w", err)
	}
	return s.List(ctx, userID, nil, nil)
}

func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}
