// Package interview は、面接の記録（面接ログ）を扱う。面接ログは必ずどこかの企業にひも付く（docs/backend-design.md 3章）。
package interview

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

// 一覧で件数の指定がないときの上限。1人の面接ログは多くても数百件なので、実質的に全件を返す
const defaultListLimit = 1000

// Question は、面接で聞かれた質問と自分の回答。Rating は受け答えの手応え（good / average / bad、未入力なら空）。
type Question struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Rating   string `json:"rating,omitempty"`
}

// Log は、面接ログと、ひも付く企業の名前。
type Log struct {
	db.InterviewLog
	CompanyName string
	Questions   []Question
}

// Fields は、面接ログの作成・更新で受け取る項目。nil の項目は、作成では未入力、更新では変更しないことを表す。
type Fields struct {
	CompanyID     *uuid.UUID
	Format        *db.InterviewFormat
	Round         *string
	InterviewDate *time.Time
	Questions     *[]Question
	Improvement   *string
	Unexpected    *string
}

type Service struct {
	pool *pgxpool.Pool
	xp   *xp.Service
}

func NewService(pool *pgxpool.Pool, xp *xp.Service) *Service {
	return &Service{pool: pool, xp: xp}
}

// List は、ユーザーの面接ログを面接日の新しい順に返す。companyID を渡すとその企業の面接ログだけに絞る。
func (s *Service) List(ctx context.Context, userID uuid.UUID, companyID *uuid.UUID, limit int) ([]Log, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	rows, err := db.New(s.pool).ListInterviewLogs(ctx, db.ListInterviewLogsParams{UserID: userID, CompanyID: companyID, MaxRows: int32(limit)})
	if err != nil {
		return nil, fmt.Errorf("list interview logs: %w", err)
	}
	logs := make([]Log, len(rows))
	for i, row := range rows {
		if logs[i], err = toLog(row.InterviewLog, row.CompanyName); err != nil {
			return nil, err
		}
	}
	return logs, nil
}

func (s *Service) Get(ctx context.Context, userID, id uuid.UUID) (Log, error) {
	return get(ctx, db.New(s.pool), userID, id)
}

// Create は、面接ログを作り、XPを付与する。作成と付与は1つのトランザクションで行う。
func (s *Service) Create(ctx context.Context, userID uuid.UUID, f Fields) (Log, xp.Result, error) {
	f = clean(f)
	switch {
	case f.CompanyID == nil:
		return Log{}, xp.Result{}, platform.Required("companyId", "企業")
	case f.Round == nil || *f.Round == "":
		return Log{}, xp.Result{}, platform.Required("round", "面接の回次")
	case f.Questions == nil || len(*f.Questions) == 0:
		return Log{}, xp.Result{}, platform.Required("questions", "質問と回答（1件以上）")
	}
	questions, err := json.Marshal(*f.Questions)
	if err != nil {
		return Log{}, xp.Result{}, fmt.Errorf("encode questions: %w", err)
	}

	var (
		log    Log
		reward xp.Result
	)
	err = platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if err := company.EnsureOwned(ctx, q, userID, *f.CompanyID); err != nil {
			return err
		}
		id, err := q.CreateInterviewLog(ctx, db.CreateInterviewLogParams{
			UserID:        userID,
			CompanyID:     *f.CompanyID,
			Format:        f.Format,
			Round:         f.Round,
			InterviewDate: f.InterviewDate,
			Questions:     questions,
			Improvement:   platform.EmptyToNil(f.Improvement),
			Unexpected:    platform.EmptyToNil(f.Unexpected),
		})
		if err != nil {
			return fmt.Errorf("create interview log: %w", err)
		}
		if reward, err = s.xp.Award(ctx, q, userID, db.XpActionInterviewLog, &id); err != nil {
			return err
		}
		log, err = get(ctx, q, userID, id)
		return err
	})
	return log, reward, err
}

// Update は、f のうち送られた項目だけを書き換える。
func (s *Service) Update(ctx context.Context, userID, id uuid.UUID, f Fields) (Log, error) {
	f = clean(f)
	if f.Round != nil && *f.Round == "" {
		return Log{}, platform.Required("round", "面接の回次")
	}
	var questions []byte
	if f.Questions != nil {
		if len(*f.Questions) == 0 {
			return Log{}, platform.Required("questions", "質問と回答（1件以上）")
		}
		var err error
		if questions, err = json.Marshal(*f.Questions); err != nil {
			return Log{}, fmt.Errorf("encode questions: %w", err)
		}
	}

	var log Log
	err := platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if f.CompanyID != nil {
			if err := company.EnsureOwned(ctx, q, userID, *f.CompanyID); err != nil {
				return err
			}
		}
		n, err := q.UpdateInterviewLog(ctx, db.UpdateInterviewLogParams{
			ID:               id,
			UserID:           userID,
			SetCompanyID:     f.CompanyID != nil,
			CompanyID:        f.CompanyID,
			SetFormat:        f.Format != nil,
			Format:           f.Format,
			SetRound:         f.Round != nil,
			Round:            f.Round,
			SetInterviewDate: f.InterviewDate != nil,
			InterviewDate:    f.InterviewDate,
			SetQuestions:     f.Questions != nil,
			Questions:        questions,
			SetImprovement:   f.Improvement != nil,
			Improvement:      platform.EmptyToNil(f.Improvement),
			SetUnexpected:    f.Unexpected != nil,
			Unexpected:       platform.EmptyToNil(f.Unexpected),
		})
		if err != nil {
			return fmt.Errorf("update interview log: %w", err)
		}
		if n == 0 {
			return notFound()
		}
		log, err = get(ctx, q, userID, id)
		return err
	})
	return log, err
}

func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	n, err := db.New(s.pool).DeleteInterviewLog(ctx, db.DeleteInterviewLogParams{ID: id, UserID: userID})
	if err != nil {
		return fmt.Errorf("delete interview log: %w", err)
	}
	if n == 0 {
		return notFound()
	}
	return nil
}

func get(ctx context.Context, q *db.Queries, userID, id uuid.UUID) (Log, error) {
	row, err := q.GetInterviewLog(ctx, db.GetInterviewLogParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return Log{}, notFound()
	}
	if err != nil {
		return Log{}, fmt.Errorf("get interview log: %w", err)
	}
	return toLog(row.InterviewLog, row.CompanyName)
}

func toLog(row db.InterviewLog, companyName string) (Log, error) {
	questions := []Question{}
	if len(row.Questions) > 0 {
		if err := json.Unmarshal(row.Questions, &questions); err != nil {
			return Log{}, fmt.Errorf("decode questions of interview log %s: %w", row.ID, err)
		}
	}
	return Log{InterviewLog: row, CompanyName: companyName, Questions: questions}, nil
}

// clean は、前後の空白を取り除き、質問も回答も空の行を除く。
func clean(f Fields) Fields {
	f.Round = platform.TrimPtr(f.Round)
	f.Improvement = platform.TrimPtr(f.Improvement)
	f.Unexpected = platform.TrimPtr(f.Unexpected)
	if f.Questions != nil {
		questions := []Question{}
		for _, q := range *f.Questions {
			q.Question = strings.TrimSpace(q.Question)
			if q.Question == "" && strings.TrimSpace(q.Answer) == "" {
				continue
			}
			questions = append(questions, q)
		}
		f.Questions = &questions
	}
	return f
}

func notFound() *platform.Error {
	return &platform.Error{Kind: platform.KindNotFound, Message: "面接ログが見つかりません"}
}
