// Package profile は、ログイン中のユーザー自身のプロフィール（XP・レベルを含む）を扱う。
package profile

import "github.com/google/uuid"

// Profile は、ユーザー1人のプロフィールと、これまでに獲得したXP・レベル。
type Profile struct {
	ID             uuid.UUID
	FullName       *string
	University     *string
	Faculty        *string
	AvatarID       *string
	TargetIndustry *string
	CareerAxis     *string
	GoalState      *string
	XP             int
	Level          int
}

// Update は、プロフィールの更新内容。nil の項目は変更しない。空文字の項目は空（null）にする。
type Update struct {
	FullName       *string
	University     *string
	Faculty        *string
	AvatarID       *string
	TargetIndustry *string
	CareerAxis     *string
	GoalState      *string
}
