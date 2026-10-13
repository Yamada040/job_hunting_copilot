package profile

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

type Repository struct {
	q *db.Queries
}

func NewRepository(conn db.DBTX) *Repository {
	return &Repository{q: db.New(conn)}
}

// Get は、ユーザーのプロフィールを返す。行がまだ無ければ作ってから返す。
func (r *Repository) Get(ctx context.Context, userID uuid.UUID) (Profile, error) {
	if err := r.q.CreateProfileIfMissing(ctx, userID); err != nil {
		return Profile{}, fmt.Errorf("create profile: %w", err)
	}
	row, err := r.q.GetProfile(ctx, userID)
	if err != nil {
		return Profile{}, fmt.Errorf("get profile: %w", err)
	}
	return fromRow(row), nil
}

// Update は、u のうち nil でない項目を書き換えて、更新後のプロフィールを返す。行がまだ無ければ作ってから書き換える。
func (r *Repository) Update(ctx context.Context, userID uuid.UUID, u Update) (Profile, error) {
	if err := r.q.CreateProfileIfMissing(ctx, userID); err != nil {
		return Profile{}, fmt.Errorf("create profile: %w", err)
	}
	row, err := r.q.UpdateProfile(ctx, db.UpdateProfileParams{
		ID:                userID,
		SetFullName:       u.FullName != nil,
		FullName:          platform.EmptyToNil(u.FullName),
		SetUniversity:     u.University != nil,
		University:        platform.EmptyToNil(u.University),
		SetFaculty:        u.Faculty != nil,
		Faculty:           platform.EmptyToNil(u.Faculty),
		SetAvatarID:       u.AvatarID != nil,
		AvatarID:          platform.EmptyToNil(u.AvatarID),
		SetTargetIndustry: u.TargetIndustry != nil,
		TargetIndustry:    platform.EmptyToNil(u.TargetIndustry),
		SetCareerAxis:     u.CareerAxis != nil,
		CareerAxis:        platform.EmptyToNil(u.CareerAxis),
		SetGoalState:      u.GoalState != nil,
		GoalState:         platform.EmptyToNil(u.GoalState),
	})
	if err != nil {
		return Profile{}, fmt.Errorf("update profile: %w", err)
	}
	return fromRow(row), nil
}

func fromRow(row db.Profile) Profile {
	return Profile{
		ID:             row.ID,
		FullName:       row.FullName,
		University:     row.University,
		Faculty:        row.Faculty,
		AvatarID:       row.AvatarID,
		TargetIndustry: row.TargetIndustry,
		CareerAxis:     row.CareerAxis,
		GoalState:      row.GoalState,
		XP:             int(row.Xp),
		Level:          int(row.Level),
	}
}
