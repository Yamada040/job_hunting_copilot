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
	"golang.org/x/text/unicode/norm"

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

// Fields は、問題の作成・書き換えで受け取る項目。
type Fields struct {
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
func (s *Service) Create(ctx context.Context, userID uuid.UUID, f Fields) (Question, xp.Result, error) {
	params, choices, err := f.params(userID)
	if err != nil {
		return Question{}, xp.Result{}, err
	}
	var (
		question Question
		reward   xp.Result
	)
	err = platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		count, err := q.CountWebtestQuestions(ctx, userID)
		if err != nil {
			return fmt.Errorf("count webtest questions: %w", err)
		}
		if err := platform.CheckLimit(count, maxQuestions, fmt.Sprintf("作成できる問題は%d問までです", maxQuestions)); err != nil {
			return err
		}
		row, err := q.CreateWebtestQuestion(ctx, params)
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

// Update は、問題全体を f で置き換える。解答の記録は、解いたときの正誤のまま残す。
func (s *Service) Update(ctx context.Context, userID, id uuid.UUID, f Fields) (Question, error) {
	params, _, err := f.params(userID)
	if err != nil {
		return Question{}, err
	}
	q := db.New(s.pool)
	_, err = q.UpdateWebtestQuestion(ctx, db.UpdateWebtestQuestionParams{
		ID: id, UserID: userID, Title: params.Title, Body: params.Body, TestType: params.TestType, Choices: params.Choices,
		Answer: params.Answer, Explanation: params.Explanation, Category: params.Category, Format: params.Format,
		Difficulty: params.Difficulty, TimeLimit: params.TimeLimit,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return Question{}, notFound()
	}
	if err != nil {
		return Question{}, fmt.Errorf("update webtest question: %w", err)
	}
	return get(ctx, q, userID, id)
}

// Delete は、問題を解答の記録ごと消す。
func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	n, err := db.New(s.pool).DeleteWebtestQuestion(ctx, db.DeleteWebtestQuestionParams{ID: id, UserID: userID})
	if err != nil {
		return fmt.Errorf("delete webtest question: %w", err)
	}
	if n == 0 {
		return notFound()
	}
	return nil
}

// params は、前後の空白を除いて必須の項目を確かめ、DBに書く値と、空の選択肢を除いた選択肢を返す。
func (f Fields) params(userID uuid.UUID) (db.CreateWebtestQuestionParams, []string, error) {
	f.Title, f.Body, f.Answer = strings.TrimSpace(f.Title), strings.TrimSpace(f.Body), strings.TrimSpace(f.Answer)
	switch {
	case f.Title == "":
		return db.CreateWebtestQuestionParams{}, nil, platform.Required("title", "タイトル")
	case f.Body == "":
		return db.CreateWebtestQuestionParams{}, nil, platform.Required("body", "問題文")
	case f.Answer == "":
		return db.CreateWebtestQuestionParams{}, nil, platform.Required("answer", "正解")
	}
	choices := []string{}
	for _, c := range f.Choices {
		if c = strings.TrimSpace(c); c != "" {
			choices = append(choices, c)
		}
	}
	var rawChoices []byte
	if len(choices) > 0 {
		var err error
		if rawChoices, err = json.Marshal(choices); err != nil {
			return db.CreateWebtestQuestionParams{}, nil, fmt.Errorf("encode choices: %w", err)
		}
	}
	var timeLimit *int32
	if f.TimeLimit != nil {
		v := int32(*f.TimeLimit)
		timeLimit = &v
	}
	return db.CreateWebtestQuestionParams{
		UserID: userID, Title: f.Title, Body: f.Body, Answer: f.Answer, Choices: rawChoices,
		Explanation: platform.EmptyToNil(platform.TrimPtr(f.Explanation)),
		TestType:    platform.EmptyToNil(platform.TrimPtr(f.TestType)),
		Category:    platform.EmptyToNil(platform.TrimPtr(f.Category)),
		Format:      platform.EmptyToNil(platform.TrimPtr(f.Format)),
		Difficulty:  platform.EmptyToNil(platform.TrimPtr(f.Difficulty)),
		TimeLimit:   timeLimit,
	}, choices, nil
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

// IsCorrect は、解答が正解と一致するかを返す。前後の空白・英字の大文字と小文字・全角と半角の違いは無視する
// （日本語入力のまま「１２」と打っても、正解の「12」と一致させる）。
func IsCorrect(answer, correct string) bool {
	normalize := func(s string) string { return strings.TrimSpace(norm.NFKC.String(s)) }
	return strings.EqualFold(normalize(answer), normalize(correct))
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
