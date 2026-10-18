// Package webtest は、ユーザーが自分で作るWebテストの練習問題と、その解答の記録を扱う。
package webtest

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

// Question は、問題と、これまでの解答の記録。
type Question struct {
	db.WebtestQuestion
	Choices  []string
	Attempts []db.WebtestAttempt
}

// NewQuestion は、問題の作成で受け取る項目。
type NewQuestion struct {
	Title, Body, Answer string
	Choices             []string
	Explanation         *string
	TestType            *string
	Category            *string
	Format              *string
	Difficulty          *string
	TimeLimit           *int
}

const (
	maxQuestions = 500
	// keptAttempts は、問題ごとに残す解答の記録の数。画面は新しい5件しか見せないので、古い記録は消してDBの容量を守る
	keptAttempts = 20
)

type Service struct {
	pool *pgxpool.Pool
	xp   *xp.Service
}

func NewService(pool *pgxpool.Pool, xp *xp.Service) *Service {
	return &Service{pool: pool, xp: xp}
}

func (s *Service) List(ctx context.Context, userID uuid.UUID, testType *string) ([]db.ListWebtestQuestionsRow, error) {
	rows, err := db.New(s.pool).ListWebtestQuestions(ctx, db.ListWebtestQuestionsParams{UserID: userID, TestType: testType})
	if err != nil {
		return nil, fmt.Errorf("list webtest questions: %w", err)
	}
	return rows, nil
}

func (s *Service) Get(ctx context.Context, userID, id uuid.UUID) (Question, error) {
	return get(ctx, db.New(s.pool), userID, id)
}

// Create は、問題を作り、XPを付与する（1日3回まで）。
func (s *Service) Create(ctx context.Context, userID uuid.UUID, n NewQuestion) (Question, xp.Result, error) {
	n.Title, n.Body, n.Answer = strings.TrimSpace(n.Title), strings.TrimSpace(n.Body), strings.TrimSpace(n.Answer)
	switch {
	case n.Title == "":
		return Question{}, xp.Result{}, platform.Required("title", "タイトル")
	case n.Body == "":
		return Question{}, xp.Result{}, platform.Required("body", "問題文")
	case n.Answer == "":
		return Question{}, xp.Result{}, platform.Required("answer", "正解")
	}
	choices := []string{}
	for _, c := range n.Choices {
		if c = strings.TrimSpace(c); c != "" {
			choices = append(choices, c)
		}
	}
	var rawChoices []byte
	if len(choices) > 0 {
		var err error
		if rawChoices, err = json.Marshal(choices); err != nil {
			return Question{}, xp.Result{}, fmt.Errorf("encode choices: %w", err)
		}
	}
	var timeLimit *int32
	if n.TimeLimit != nil {
		v := int32(*n.TimeLimit)
		timeLimit = &v
	}

	var (
		question Question
		reward   xp.Result
	)
	err := platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		count, err := q.CountWebtestQuestions(ctx, userID)
		if err != nil {
			return fmt.Errorf("count webtest questions: %w", err)
		}
		if err := platform.CheckLimit(count, maxQuestions, fmt.Sprintf("作成できる問題は%d問までです", maxQuestions)); err != nil {
			return err
		}
		row, err := q.CreateWebtestQuestion(ctx, db.CreateWebtestQuestionParams{
			UserID: userID, Title: n.Title, Body: n.Body, Answer: n.Answer, Choices: rawChoices,
			Explanation: platform.EmptyToNil(platform.TrimPtr(n.Explanation)),
			TestType:    platform.EmptyToNil(platform.TrimPtr(n.TestType)),
			Category:    platform.EmptyToNil(platform.TrimPtr(n.Category)),
			Format:      platform.EmptyToNil(platform.TrimPtr(n.Format)),
			Difficulty:  platform.EmptyToNil(platform.TrimPtr(n.Difficulty)),
			TimeLimit:   timeLimit,
		})
		if err != nil {
			return fmt.Errorf("create webtest question: %w", err)
		}
		if reward, err = s.xp.Award(ctx, q, userID, db.XpActionWebtestQuestionCreate, &row.ID); err != nil {
			return err
		}
		question = Question{WebtestQuestion: row, Choices: choices, Attempts: []db.WebtestAttempt{}}
		return nil
	})
	return question, reward, err
}

// Answer は、解答の正誤を判定して記録し、XPを付与する（1日2回まで）。
func (s *Service) Answer(ctx context.Context, userID, questionID uuid.UUID, answer string, timeSpent *int) (db.WebtestAttempt, xp.Result, error) {
	var (
		attempt db.WebtestAttempt
		reward  xp.Result
	)
	err := platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		question, err := q.GetWebtestQuestion(ctx, db.GetWebtestQuestionParams{ID: questionID, UserID: userID})
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound()
		}
		if err != nil {
			return fmt.Errorf("get webtest question: %w", err)
		}
		correct := IsCorrect(answer, question.Answer)
		var spent *int32
		if timeSpent != nil {
			v := int32(*timeSpent)
			spent = &v
		}
		attempt, err = q.CreateWebtestAttempt(ctx, db.CreateWebtestAttemptParams{UserID: userID, QuestionID: questionID, IsCorrect: &correct, TimeSpent: spent})
		if err != nil {
			return fmt.Errorf("create webtest attempt: %w", err)
		}
		if err := q.DeleteOldWebtestAttempts(ctx, db.DeleteOldWebtestAttemptsParams{QuestionID: questionID, UserID: userID, KeptRows: keptAttempts}); err != nil {
			return fmt.Errorf("delete old webtest attempts: %w", err)
		}
		reward, err = s.xp.Award(ctx, q, userID, db.XpActionWebtestAttemptComplete, &attempt.ID)
		return err
	})
	return attempt, reward, err
}

// IsCorrect は、解答が正解と一致するかを返す。前後の空白と英字の大文字・小文字は無視する。
func IsCorrect(answer, correct string) bool {
	return strings.EqualFold(strings.TrimSpace(answer), strings.TrimSpace(correct))
}

func get(ctx context.Context, q *db.Queries, userID, id uuid.UUID) (Question, error) {
	row, err := q.GetWebtestQuestion(ctx, db.GetWebtestQuestionParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return Question{}, notFound()
	}
	if err != nil {
		return Question{}, fmt.Errorf("get webtest question: %w", err)
	}
	choices := []string{}
	if len(row.Choices) > 0 {
		if err := json.Unmarshal(row.Choices, &choices); err != nil {
			return Question{}, fmt.Errorf("decode choices of webtest question %s: %w", row.ID, err)
		}
	}
	attempts, err := q.ListWebtestAttempts(ctx, db.ListWebtestAttemptsParams{QuestionID: id, UserID: userID})
	if err != nil {
		return Question{}, fmt.Errorf("list webtest attempts: %w", err)
	}
	return Question{WebtestQuestion: row, Choices: choices, Attempts: attempts}, nil
}

func notFound() *platform.Error {
	return &platform.Error{Kind: platform.KindNotFound, Message: "問題が見つかりません"}
}
