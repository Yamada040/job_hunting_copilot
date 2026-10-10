// Package xp は、操作に応じたXPの付与とレベルの計算を受け持つ。ルールは画面ではなく操作に結び付ける（docs/backend-design.md 3章）。
package xp

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
)

// PerLevel は、1レベル上がるのに必要なXP。
const PerLevel = 25

// LevelOf は、合計XPからレベルを求める（レベル = XP ÷ 25 の切り捨て ＋ 1）。
func LevelOf(total int) int {
	return total/PerLevel + 1
}

type rule struct {
	amount int
	// 同じ対象（ESなど）には1回だけ付与する。対象のIDが必須
	perTarget bool
	// 1日（日本時間）に付与する回数の上限。0なら上限なし
	dailyCap int
	// ユーザーごとに初回だけ付与する
	once bool
}

var rules = map[db.XpAction]rule{
	db.XpActionEsSubmitted:            {amount: 25, perTarget: true, dailyCap: 5},
	db.XpActionInterviewLog:           {amount: 20, perTarget: true},
	db.XpActionCompanyNew:             {amount: 5, perTarget: true, dailyCap: 5},
	db.XpActionAptitudeComplete:       {amount: 15, once: true},
	db.XpActionSelfAnalysisComplete:   {amount: 15, once: true},
	db.XpActionWebtestQuestionCreate:  {amount: 5, perTarget: true, dailyCap: 3},
	db.XpActionWebtestAttemptComplete: {amount: 15, perTarget: true, dailyCap: 2},
}

// 利用者は日本の就活生なので、日次上限の「1日」は日本時間で区切る
var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

// Result は、1回の操作でのXP付与の結果。付与されなかった場合も、現在の合計とレベルを返す。
type Result struct {
	Awarded   int
	Total     int
	Level     int
	LeveledUp bool
}

type Service struct {
	now func() time.Time
}

func NewService() *Service {
	return &Service{now: time.Now}
}

// Award は、操作 action に対してXPを付与する。q は呼び出し元のトランザクションに結び付いたものを渡し、
// 元の操作（ESの提出など）とXPの付与を1つのトランザクションにまとめる（片方だけ成功する状態を作らない）。
func (s *Service) Award(ctx context.Context, q *db.Queries, userID uuid.UUID, action db.XpAction, refID *uuid.UUID) (Result, error) {
	r, ok := rules[action]
	if !ok {
		return Result{}, fmt.Errorf("no xp rule for %q", action)
	}
	if r.perTarget && refID == nil {
		return Result{}, fmt.Errorf("xp action %q needs a target id", action)
	}

	if err := q.CreateProfileIfMissing(ctx, userID); err != nil {
		return Result{}, fmt.Errorf("create profile: %w", err)
	}
	// ここから commit まで、同じユーザーの他の付与は待たされる。日次上限の確認と追加の間に割り込まれないようにするため
	current, err := q.LockProfileXP(ctx, userID)
	if err != nil {
		return Result{}, fmt.Errorf("lock profile: %w", err)
	}
	total := int(current)
	unchanged := Result{Total: total, Level: LevelOf(total)}

	if r.once {
		done, err := q.HasXPLog(ctx, db.HasXPLogParams{UserID: userID, Action: action})
		if err != nil {
			return Result{}, fmt.Errorf("check first time: %w", err)
		}
		if done {
			return unchanged, nil
		}
	}
	if r.dailyCap > 0 {
		now := s.now().In(jst)
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst)
		count, err := q.CountXPLogsSince(ctx, db.CountXPLogsSinceParams{UserID: userID, Action: action, Since: startOfDay})
		if err != nil {
			return Result{}, fmt.Errorf("count today's xp: %w", err)
		}
		if count >= int64(r.dailyCap) {
			return unchanged, nil
		}
	}

	inserted, err := q.InsertXPLog(ctx, db.InsertXPLogParams{UserID: userID, Xp: int32(r.amount), Action: action, RefID: refID})
	if err != nil {
		return Result{}, fmt.Errorf("insert xp log: %w", err)
	}
	if inserted == 0 {
		return unchanged, nil
	}

	next := total + r.amount
	if err := q.SetProfileXP(ctx, db.SetProfileXPParams{ID: userID, Xp: int32(next), Level: int32(LevelOf(next))}); err != nil {
		return Result{}, fmt.Errorf("update profile xp: %w", err)
	}
	return Result{
		Awarded:   r.amount,
		Total:     next,
		Level:     LevelOf(next),
		LeveledUp: LevelOf(next) > LevelOf(total),
	}, nil
}

// ToAPI は、XP付与の結果をAPIの形にする。XPが付く操作のレスポンスで共通に使う。
func ToAPI(r Result) openapi.XpResult {
	return openapi.XpResult{Awarded: r.Awarded, Total: r.Total, Level: r.Level, LeveledUp: r.LeveledUp}
}
