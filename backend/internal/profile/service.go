package profile

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

type store interface {
	Get(ctx context.Context, userID uuid.UUID) (Profile, error)
	Update(ctx context.Context, userID uuid.UUID, u Update) (Profile, error)
}

type Service struct {
	store      store
	developers map[uuid.UUID]bool
}

// NewService は、developers に含まれるユーザーを開発者として扱う Service を作る。
func NewService(s store, developers []uuid.UUID) *Service {
	set := make(map[uuid.UUID]bool, len(developers))
	for _, id := range developers {
		set[id] = true
	}
	return &Service{store: s, developers: set}
}

func (s *Service) Get(ctx context.Context, userID uuid.UUID) (Profile, error) {
	return s.store.Get(ctx, userID)
}

// Update は、前後の空白を取り除いてからプロフィールを更新する。氏名は空にできない。
func (s *Service) Update(ctx context.Context, userID uuid.UUID, u Update) (Profile, error) {
	u = Update{
		FullName:       trim(u.FullName),
		University:     trim(u.University),
		Faculty:        trim(u.Faculty),
		AvatarID:       trim(u.AvatarID),
		TargetIndustry: trim(u.TargetIndustry),
		CareerAxis:     trim(u.CareerAxis),
		GoalState:      trim(u.GoalState),
	}
	if u.FullName != nil && *u.FullName == "" {
		return Profile{}, &platform.Error{
			Kind:    platform.KindInvalid,
			Message: "入力内容に誤りがあります",
			Fields:  []platform.FieldError{{Field: "fullName", Message: "氏名を入力してください"}},
		}
	}
	return s.store.Update(ctx, userID, u)
}

// IsDeveloper は、ユーザーが開発者向けの画面を使えるかを返す。
func (s *Service) IsDeveloper(userID uuid.UUID) bool {
	return s.developers[userID]
}

func trim(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	return &t
}
