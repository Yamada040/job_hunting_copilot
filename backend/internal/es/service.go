// Package es は、エントリーシート（ES）を扱う。ESは必ずどこかの企業にひも付く（docs/backend-design.md 3章）。
package es

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

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

// 一覧で件数の指定がないときの上限。1人のESは多くても数百件なので、実質的に全件を返す
const defaultListLimit = 1000

// Question は、ESの設問と回答。
type Question struct {
	Prompt string `json:"prompt"`
	Answer string `json:"answer"`
}

// Entry は、ESと、ひも付く企業の名前。
type Entry struct {
	db.EsEntry
	CompanyName string
	Questions   []Question
}

// Fields は、ESの作成・更新で受け取る項目。nil の項目は、作成では未入力、更新では変更しないことを表す。
type Fields struct {
	CompanyID *uuid.UUID
	Title     *string
	Position  *string
	Questions *[]Question
	ContentMd *string
	Tags      *[]string
	Memo      *string
	// SetDeadline が true のときだけ Deadline を書き換える。Deadline が nil なら締切を消す
	SetDeadline bool
	Deadline    *time.Time
}

type Service struct {
	pool    *pgxpool.Pool
	xp      *xp.Service
	ai      ai.Generator
	limiter *ratelimit.Limiter
}

func NewService(pool *pgxpool.Pool, xp *xp.Service, ai ai.Generator, limiter *ratelimit.Limiter) *Service {
	return &Service{pool: pool, xp: xp, ai: ai, limiter: limiter}
}

// List は、ユーザーのESを更新日時の新しい順に返す。companyID を渡すとその企業のESだけに絞る。
func (s *Service) List(ctx context.Context, userID uuid.UUID, companyID *uuid.UUID, limit int) ([]Entry, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	rows, err := db.New(s.pool).ListEsEntries(ctx, db.ListEsEntriesParams{UserID: userID, CompanyID: companyID, MaxRows: int32(limit)})
	if err != nil {
		return nil, fmt.Errorf("list es entries: %w", err)
	}
	entries := make([]Entry, len(rows))
	for i, row := range rows {
		if entries[i], err = toEntry(row.EsEntry, row.CompanyName); err != nil {
			return nil, err
		}
	}
	return entries, nil
}

func (s *Service) Get(ctx context.Context, userID, id uuid.UUID) (Entry, error) {
	return get(ctx, db.New(s.pool), userID, id)
}

// Create は、ESを下書きとして作る。提出は Submit で行う。
func (s *Service) Create(ctx context.Context, userID uuid.UUID, f Fields) (Entry, error) {
	f = clean(f)
	if f.CompanyID == nil {
		return Entry{}, platform.Required("companyId", "企業")
	}
	if f.Title == nil || *f.Title == "" {
		return Entry{}, platform.Required("title", "タイトル")
	}
	questions, err := json.Marshal(valueOr(f.Questions, []Question{}))
	if err != nil {
		return Entry{}, fmt.Errorf("encode questions: %w", err)
	}

	var entry Entry
	err = platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if err := company.EnsureOwned(ctx, q, userID, *f.CompanyID); err != nil {
			return err
		}
		id, err := q.CreateEsEntry(ctx, db.CreateEsEntryParams{
			UserID:    userID,
			CompanyID: *f.CompanyID,
			Position:  platform.EmptyToNil(f.Position),
			Title:     f.Title,
			ContentMd: platform.EmptyToNil(f.ContentMd),
			Questions: questions,
			Tags:      valueOr(f.Tags, []string{}),
			Deadline:  f.Deadline,
			Memo:      platform.EmptyToNil(f.Memo),
		})
		if err != nil {
			return fmt.Errorf("create es entry: %w", err)
		}
		entry, err = get(ctx, q, userID, id)
		return err
	})
	return entry, err
}

// Update は、f のうち送られた項目だけを書き換える。提出済みかどうかはここでは変えない。
func (s *Service) Update(ctx context.Context, userID, id uuid.UUID, f Fields) (Entry, error) {
	f = clean(f)
	if f.Title != nil && *f.Title == "" {
		return Entry{}, platform.Required("title", "タイトル")
	}
	var questions []byte
	if f.Questions != nil {
		var err error
		if questions, err = json.Marshal(*f.Questions); err != nil {
			return Entry{}, fmt.Errorf("encode questions: %w", err)
		}
	}

	var entry Entry
	err := platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if f.CompanyID != nil {
			if err := company.EnsureOwned(ctx, q, userID, *f.CompanyID); err != nil {
				return err
			}
		}
		var tags []string
		if f.Tags != nil {
			tags = *f.Tags
		}
		n, err := q.UpdateEsEntry(ctx, db.UpdateEsEntryParams{
			ID:           id,
			UserID:       userID,
			SetCompanyID: f.CompanyID != nil,
			CompanyID:    f.CompanyID,
			SetTitle:     f.Title != nil,
			Title:        f.Title,
			SetPosition:  f.Position != nil,
			Position:     platform.EmptyToNil(f.Position),
			SetQuestions: f.Questions != nil,
			Questions:    questions,
			SetContentMd: f.ContentMd != nil,
			ContentMd:    platform.EmptyToNil(f.ContentMd),
			SetTags:      f.Tags != nil,
			Tags:         tags,
			SetDeadline:  f.SetDeadline,
			Deadline:     f.Deadline,
			SetMemo:      f.Memo != nil,
			Memo:         platform.EmptyToNil(f.Memo),
		})
		if err != nil {
			return fmt.Errorf("update es entry: %w", err)
		}
		if n == 0 {
			return notFound()
		}
		entry, err = get(ctx, q, userID, id)
		return err
	})
	return entry, err
}

// Submit は、ESを提出済みにしてXPを付与する。提出は取り消せない。
// 提出済みのESにもう一度呼んでもエラーにはしない（XPは同じESには1回しか付かない）。
func (s *Service) Submit(ctx context.Context, userID, id uuid.UUID) (Entry, xp.Result, error) {
	var (
		entry  Entry
		reward xp.Result
	)
	err := platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		n, err := q.SubmitEsEntry(ctx, db.SubmitEsEntryParams{ID: id, UserID: userID})
		if err != nil {
			return fmt.Errorf("submit es entry: %w", err)
		}
		if n == 0 {
			return notFound()
		}
		if reward, err = s.xp.Award(ctx, q, userID, db.XpActionEsSubmitted, &id); err != nil {
			return err
		}
		entry, err = get(ctx, q, userID, id)
		return err
	})
	return entry, reward, err
}

// Review は、保存済みのESの内容をAIに添削させ、添削結果を保存する。何度でも実行でき、結果は上書きする。
// AIへの入力は画面から受け取らず、保存済みのデータから組み立てる（docs/backend-design.md 5章）。
func (s *Service) Review(ctx context.Context, userID, id uuid.UUID) (Entry, error) {
	q := db.New(s.pool)
	entry, err := get(ctx, q, userID, id)
	if err != nil {
		return Entry{}, err
	}
	input := reviewInput(entry)
	if input == "" {
		return Entry{}, &platform.Error{Kind: platform.KindInvalid, Message: "添削する設問・回答または本文を入力して保存してください"}
	}
	if err := s.limiter.Hit(ctx, q, userID, ratelimit.AIBurst, ratelimit.AIDaily); err != nil {
		return Entry{}, err
	}
	text, err := s.ai.Generate(ctx, ai.KindESReview, input)
	if err != nil {
		return Entry{}, err
	}
	n, err := q.SetEsAiResult(ctx, db.SetEsAiResultParams{ID: id, UserID: userID, AiResult: &text})
	if err != nil {
		return Entry{}, fmt.Errorf("save es review: %w", err)
	}
	if n == 0 {
		return Entry{}, notFound()
	}
	return get(ctx, q, userID, id)
}

// reviewInput は、AI添削に渡す文章を作る。設問も本文も無ければ空文字を返す。
func reviewInput(e Entry) string {
	var body []string
	for i, q := range e.Questions {
		body = append(body, fmt.Sprintf("設問%d: %s\n回答: %s", i+1, q.Prompt, q.Answer))
	}
	if e.ContentMd != nil && strings.TrimSpace(*e.ContentMd) != "" {
		body = append(body, "本文:\n"+*e.ContentMd)
	}
	if len(body) == 0 {
		return ""
	}
	header := []string{"企業: " + e.CompanyName}
	if e.Title != nil {
		header = append(header, "タイトル: "+*e.Title)
	}
	if e.Position != nil {
		header = append(header, "職種・募集枠: "+*e.Position)
	}
	return strings.Join(header, "\n") + "\n\n" + strings.Join(body, "\n\n")
}

func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	n, err := db.New(s.pool).DeleteEsEntry(ctx, db.DeleteEsEntryParams{ID: id, UserID: userID})
	if err != nil {
		return fmt.Errorf("delete es entry: %w", err)
	}
	if n == 0 {
		return notFound()
	}
	return nil
}

func get(ctx context.Context, q *db.Queries, userID, id uuid.UUID) (Entry, error) {
	row, err := q.GetEsEntry(ctx, db.GetEsEntryParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return Entry{}, notFound()
	}
	if err != nil {
		return Entry{}, fmt.Errorf("get es entry: %w", err)
	}
	return toEntry(row.EsEntry, row.CompanyName)
}

func toEntry(row db.EsEntry, companyName string) (Entry, error) {
	questions := []Question{}
	if len(row.Questions) > 0 {
		if err := json.Unmarshal(row.Questions, &questions); err != nil {
			return Entry{}, fmt.Errorf("decode questions of es entry %s: %w", row.ID, err)
		}
	}
	return Entry{EsEntry: row, CompanyName: companyName, Questions: questions}, nil
}

// clean は、前後の空白を取り除き、空の設問・空のタグ・重複したタグを除く。
func clean(f Fields) Fields {
	f.Title = platform.TrimPtr(f.Title)
	f.Position = platform.TrimPtr(f.Position)
	f.Memo = platform.TrimPtr(f.Memo)
	if f.Questions != nil {
		questions := []Question{}
		for _, q := range *f.Questions {
			q.Prompt = strings.TrimSpace(q.Prompt)
			if q.Prompt == "" && strings.TrimSpace(q.Answer) == "" {
				continue
			}
			questions = append(questions, q)
		}
		f.Questions = &questions
	}
	if f.Tags != nil {
		seen := map[string]bool{}
		tags := []string{}
		for _, t := range *f.Tags {
			t = strings.TrimSpace(t)
			if t == "" || seen[t] {
				continue
			}
			seen[t] = true
			tags = append(tags, t)
		}
		f.Tags = &tags
	}
	return f
}

func valueOr[T any](p *T, fallback T) T {
	if p == nil {
		return fallback
	}
	return *p
}

func notFound() *platform.Error {
	return &platform.Error{Kind: platform.KindNotFound, Message: "ESが見つかりません"}
}
