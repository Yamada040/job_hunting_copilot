// Package assessment は、適性診断と自己分析を扱う。どちらも「1人1回の回答 → 初回だけXP → AIの診断も1回だけ」という
// 同じ流れなので、回答の型とAIへの入力の作り方だけを差し替えて共通に実装する（docs/backend-design.md 3章）。
package assessment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

// Result は、保存済みの回答とAIの結果。
type Result[A any] struct {
	ID        uuid.UUID
	Answers   A
	AIResult  *string
	CreatedAt time.Time
}

// record は、適性診断と自己分析のテーブルで共通の列。
type record struct {
	ID        uuid.UUID
	Answers   []byte
	AIResult  *string
	CreatedAt time.Time
}

// table は、テーブルごとの問い合わせ。適性診断と自己分析で差し替える。
type table struct {
	get       func(ctx context.Context, q *db.Queries, userID uuid.UUID) (record, error)
	create    func(ctx context.Context, q *db.Queries, userID uuid.UUID, answers []byte) (int64, error)
	setAIOnce func(ctx context.Context, q *db.Queries, userID uuid.UUID, text string, usage ai.Usage) (int64, error)
}

// kind は、適性診断と自己分析の違い。
type kind[A any] struct {
	table    table
	xpAction db.XpAction
	aiKind   ai.Kind
	// aiInput は、保存済みの回答からAIへの入力を作る
	aiInput func(A) string
	label   string
}

type Service[A any] struct {
	pool    *pgxpool.Pool
	xp      *xp.Service
	ai      ai.Generator
	limiter *ratelimit.Limiter
	kind    kind[A]
}

// Get は、回答と結果を返す。まだ回答していなければ nil（回答が無いのは普通の状態なので、エラーにはしない）。
func (s *Service[A]) Get(ctx context.Context, userID uuid.UUID) (*Result[A], error) {
	r, err := s.get(ctx, db.New(s.pool), userID)
	var appErr *platform.Error
	if errors.As(err, &appErr) && appErr.Kind == platform.KindNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// Submit は、回答を保存し、初回だけXPを付与する。2回目は 409。
func (s *Service[A]) Submit(ctx context.Context, userID uuid.UUID, answers A) (Result[A], xp.Result, error) {
	raw, err := json.Marshal(answers)
	if err != nil {
		return Result[A]{}, xp.Result{}, fmt.Errorf("encode answers: %w", err)
	}
	var (
		result Result[A]
		reward xp.Result
	)
	err = platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		n, err := s.kind.table.create(ctx, q, userID, raw)
		if err != nil {
			return fmt.Errorf("create %s: %w", s.kind.label, err)
		}
		if n == 0 {
			return &platform.Error{Kind: platform.KindConflict, Message: s.kind.label + "は1回だけ回答できます。すでに回答済みです。"}
		}
		if reward, err = s.xp.Award(ctx, q, userID, s.kind.xpAction, nil); err != nil {
			return err
		}
		result, err = s.get(ctx, q, userID)
		return err
	})
	return result, reward, err
}

// Diagnose は、保存済みの回答をもとにAIの診断を行い、結果を保存する。1回だけで、2回目は 409。
// AIは数秒〜数十秒かかるため、トランザクションの外で呼び、1回の制限は保存時の条件で守る。
func (s *Service[A]) Diagnose(ctx context.Context, userID uuid.UUID) (Result[A], error) {
	q := db.New(s.pool)
	result, err := s.get(ctx, q, userID)
	if err != nil {
		return Result[A]{}, err
	}
	if result.AIResult != nil {
		return Result[A]{}, s.alreadyDone()
	}
	if err := s.limiter.Hit(ctx, q, userID, ratelimit.AIBurst, ratelimit.AIDaily); err != nil {
		return Result[A]{}, err
	}
	text, usage, err := s.ai.Generate(ctx, s.kind.aiKind, s.kind.aiInput(result.Answers))
	if err != nil {
		return Result[A]{}, err
	}
	n, err := s.kind.table.setAIOnce(ctx, q, userID, text, usage)
	if err != nil {
		return Result[A]{}, fmt.Errorf("save %s ai result: %w", s.kind.label, err)
	}
	if n == 0 {
		return Result[A]{}, s.alreadyDone()
	}
	return s.get(ctx, q, userID)
}

func (s *Service[A]) get(ctx context.Context, q *db.Queries, userID uuid.UUID) (Result[A], error) {
	rec, err := s.kind.table.get(ctx, q, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Result[A]{}, &platform.Error{Kind: platform.KindNotFound, Message: s.kind.label + "にまだ回答していません"}
	}
	if err != nil {
		return Result[A]{}, fmt.Errorf("get %s: %w", s.kind.label, err)
	}
	var answers A
	if err := json.Unmarshal(rec.Answers, &answers); err != nil {
		return Result[A]{}, fmt.Errorf("decode %s answers: %w", s.kind.label, err)
	}
	return Result[A]{ID: rec.ID, Answers: answers, AIResult: rec.AIResult, CreatedAt: rec.CreatedAt}, nil
}

func (s *Service[A]) alreadyDone() *platform.Error {
	return &platform.Error{Kind: platform.KindConflict, Message: s.kind.label + "のAIの結果はすでに出ています（1回までです）"}
}
