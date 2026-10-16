// Package companyoverview は、企業を起点に就活の現在地をまとめて返す読み取り専用のビューを扱う。
package companyoverview

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/calendar"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/es"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// CompanyReader は、overview の作成に必要な企業の読み取り操作。
type CompanyReader interface {
	List(context.Context, uuid.UUID, string) ([]db.Company, error)
	Get(context.Context, uuid.UUID, uuid.UUID) (db.Company, error)
}

// ESReader は、overview の作成に必要なESの読み取り操作。
type ESReader interface {
	List(context.Context, uuid.UUID, *uuid.UUID, int) ([]es.Entry, error)
}

// CalendarReader は、overview の作成に必要な予定の読み取り操作。
type CalendarReader interface {
	List(context.Context, uuid.UUID, *time.Time, *time.Time) ([]calendar.Item, error)
}

// Company は、overview で返す企業の要点。
type Company struct {
	ID         string  `json:"id" jsonschema:"企業ID"`
	Name       string  `json:"name" jsonschema:"企業名"`
	Industry   *string `json:"industry,omitempty" jsonschema:"業界"`
	Stage      string  `json:"stage" jsonschema:"選考状況のコード"`
	Preference *int16  `json:"preference,omitempty" jsonschema:"志望度。未設定ならnull"`
	Favorite   bool    `json:"favorite" jsonschema:"お気に入りか"`
	MypageURL  *string `json:"mypageUrl,omitempty" jsonschema:"マイページURL"`
	Memo       *string `json:"memo,omitempty" jsonschema:"企業についてのメモ"`
	UpdatedAt  string  `json:"updatedAt" jsonschema:"企業情報の最終更新日時"`
}

// Question は、ESの設問と回答。
type Question struct {
	Prompt    string `json:"prompt" jsonschema:"設問"`
	Answer    string `json:"answer" jsonschema:"回答"`
	CharLimit *int   `json:"charLimit,omitempty" jsonschema:"文字数上限。未設定ならnull"`
}

// ES は、企業にひも付くESの内容と状態。
type ES struct {
	ID        string     `json:"id" jsonschema:"ESのID"`
	Title     string     `json:"title" jsonschema:"ESのタイトル"`
	Position  *string    `json:"position,omitempty" jsonschema:"職種や募集枠"`
	Status    string     `json:"status" jsonschema:"ESの状態。draftまたはsubmitted"`
	Deadline  *string    `json:"deadline,omitempty" jsonschema:"締切日。未設定ならnull"`
	Questions []Question `json:"questions" jsonschema:"設問と回答"`
	ContentMD *string    `json:"contentMd,omitempty" jsonschema:"自由記述のMarkdown本文"`
	Tags      []string   `json:"tags" jsonschema:"タグ"`
	Memo      *string    `json:"memo,omitempty" jsonschema:"ESのメモ"`
	UpdatedAt string     `json:"updatedAt" jsonschema:"ESの最終更新日時"`
}

// UpcomingItem は、今日以降の予定またはES締切。
type UpcomingItem struct {
	ID      string  `json:"id" jsonschema:"予定またはESのID"`
	Source  string  `json:"source" jsonschema:"eventは予定、es_deadlineはES締切"`
	Title   string  `json:"title" jsonschema:"予定またはESのタイトル"`
	Type    string  `json:"type" jsonschema:"予定種別"`
	Date    string  `json:"date" jsonschema:"開始日または締切日"`
	EndDate *string `json:"endDate,omitempty" jsonschema:"終了日。1日だけならnull"`
	Time    *string `json:"time,omitempty" jsonschema:"時刻。未設定ならnull"`
	URL     *string `json:"url,omitempty" jsonschema:"関連URL。未設定ならnull"`
	Note    *string `json:"note,omitempty" jsonschema:"予定の備考。未設定ならnull"`
}

// Overview は、企業の選考状況・ES・今後の予定をまとめた読み取り用データ。
type Overview struct {
	Company  Company        `json:"company" jsonschema:"企業情報"`
	ES       []ES           `json:"es" jsonschema:"この企業にひも付くES"`
	Upcoming []UpcomingItem `json:"upcoming" jsonschema:"今日以降の予定とES締切"`
}

// Service は、既存の各機能サービスを横断してoverviewを作る。
type Service struct {
	companies CompanyReader
	es        ESReader
	calendar  CalendarReader
	now       func() time.Time
}

func NewService(companies CompanyReader, esService ESReader, calendarService CalendarReader) *Service {
	return &Service{companies: companies, es: esService, calendar: calendarService, now: time.Now}
}

// GetByName は、本人の企業名を指定してoverviewを返す。企業名は正規化した完全一致で決める。
func (s *Service) GetByName(ctx context.Context, userID uuid.UUID, name string) (Overview, error) {
	if company.Normalize(name) == "" {
		return Overview{}, &platform.Error{Kind: platform.KindInvalid, Message: "企業名を入力してください"}
	}
	companies, err := s.companies.List(ctx, userID, name)
	if err != nil {
		return Overview{}, fmt.Errorf("list companies for overview: %w", err)
	}
	for _, c := range companies {
		if company.Normalize(c.Name) == company.Normalize(name) {
			return s.get(ctx, userID, c)
		}
	}
	return Overview{}, &platform.Error{Kind: platform.KindNotFound, Message: "企業が見つかりません"}
}

// Get は、本人の企業IDを指定してoverviewを返す。
func (s *Service) Get(ctx context.Context, userID, companyID uuid.UUID) (Overview, error) {
	c, err := s.companies.Get(ctx, userID, companyID)
	if err != nil {
		return Overview{}, err
	}
	return s.get(ctx, userID, c)
}

func (s *Service) get(ctx context.Context, userID uuid.UUID, c db.Company) (Overview, error) {
	entries, err := s.es.List(ctx, userID, &c.ID, 0)
	if err != nil {
		return Overview{}, fmt.Errorf("list es entries for overview: %w", err)
	}
	today := tokyoDate(s.now())
	items, err := s.calendar.List(ctx, userID, &today, nil)
	if err != nil {
		return Overview{}, fmt.Errorf("list upcoming items for overview: %w", err)
	}

	overview := Overview{Company: toCompany(c), ES: make([]ES, len(entries))}
	for i, entry := range entries {
		overview.ES[i] = toES(entry)
	}
	for _, item := range items {
		if item.CompanyID != nil && *item.CompanyID == c.ID {
			overview.Upcoming = append(overview.Upcoming, toUpcomingItem(item))
		}
	}
	if overview.Upcoming == nil {
		overview.Upcoming = []UpcomingItem{}
	}
	return overview, nil
}

func tokyoDate(now time.Time) time.Time {
	jst := time.FixedZone("Asia/Tokyo", 9*60*60)
	now = now.In(jst)
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst)
}

func toCompany(c db.Company) Company {
	return Company{
		ID: c.ID.String(), Name: c.Name, Industry: c.Industry, Stage: string(c.Stage), Preference: c.Preference,
		Favorite: c.Favorite, MypageURL: c.MypageUrl, Memo: c.Memo, UpdatedAt: c.UpdatedAt.Format(time.RFC3339),
	}
}

func toES(entry es.Entry) ES {
	title := ""
	if entry.Title != nil {
		title = *entry.Title
	}
	questions := make([]Question, len(entry.Questions))
	for i, question := range entry.Questions {
		questions[i] = Question{Prompt: question.Prompt, Answer: question.Answer, CharLimit: question.CharLimit}
	}
	var deadline *string
	if entry.Deadline != nil {
		v := entry.Deadline.Format(time.DateOnly)
		deadline = &v
	}
	return ES{
		ID: entry.ID.String(), Title: title, Position: entry.Position, Status: string(entry.Status), Deadline: deadline,
		Questions: questions, ContentMD: entry.ContentMd, Tags: entry.Tags, Memo: entry.Memo,
		UpdatedAt: entry.UpdatedAt.Format(time.RFC3339),
	}
}

func toUpcomingItem(item calendar.Item) UpcomingItem {
	var endDate *string
	if item.EndDate != nil {
		v := item.EndDate.Format(time.DateOnly)
		endDate = &v
	}
	return UpcomingItem{
		ID: item.ID.String(), Source: string(item.Source), Title: item.Title, Type: string(item.Type),
		Date: item.Date.Format(time.DateOnly), EndDate: endDate, Time: item.Time, URL: item.URL, Note: item.Note,
	}
}
