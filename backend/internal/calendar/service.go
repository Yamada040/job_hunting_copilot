// Package calendar は、カレンダーの予定を扱う。カレンダーには、ユーザーが登録した予定とESの締切を並べて表示する（docs/backend-design.md 3章）。
package calendar

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/company"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// Source は、カレンダーの1件がどこから来たかを表す。
type Source string

const (
	SourceEvent      Source = "event"
	SourceESDeadline Source = "es_deadline"
)

// Item は、カレンダーの1件。Source が SourceEvent なら ID は予定のID、SourceESDeadline なら ESのID。
type Item struct {
	ID          uuid.UUID
	Source      Source
	Title       string
	Type        db.CalendarEventType
	Date        time.Time
	Time        *string // HH:MM
	CompanyID   *uuid.UUID
	CompanyName *string
	// URL は、予定のリンク（オンライン面接のURLなど）。ESの締切には無い
	URL *string
}

// Fields は、予定の登録・更新で受け取る項目。nil の項目は、登録では未入力、更新では変更しないことを表す。
type Fields struct {
	Title *string
	Type  *db.CalendarEventType
	Date  *time.Time
	// SetTime が true のときだけ Time を書き換える。Time が nil なら時刻を消す
	SetTime bool
	Time    *string
	// SetCompanyID が true のときだけ CompanyID を書き換える。CompanyID が nil なら企業とのひも付けを外す
	SetCompanyID bool
	CompanyID    *uuid.UUID
	// SetURL が true のときだけ URL を書き換える（登録では URL をそのまま使う）。URL が nil ならリンクを消す
	SetURL bool
	URL    *string
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// List は、期間内の予定とESの締切を日付順にまとめて返す。from・to は nil なら絞らない。
func (s *Service) List(ctx context.Context, userID uuid.UUID, from, to *time.Time) ([]Item, error) {
	q := db.New(s.pool)
	events, err := q.ListCalendarEvents(ctx, db.ListCalendarEventsParams{UserID: userID, FromDate: from, ToDate: to})
	if err != nil {
		return nil, fmt.Errorf("list calendar events: %w", err)
	}
	deadlines, err := q.ListEsDeadlines(ctx, db.ListEsDeadlinesParams{UserID: userID, FromDate: from, ToDate: to})
	if err != nil {
		return nil, fmt.Errorf("list es deadlines: %w", err)
	}

	items := make([]Item, 0, len(events)+len(deadlines))
	for _, e := range events {
		items = append(items, fromEvent(e.CalendarEvent, e.CompanyName))
	}
	for _, d := range deadlines {
		title := "ES締切"
		if d.Title != nil && *d.Title != "" {
			title = *d.Title
		}
		companyID, companyName := d.CompanyID, d.CompanyName
		items = append(items, Item{
			ID: d.ID, Source: SourceESDeadline, Title: title, Type: db.CalendarEventTypeEs,
			Date: d.Deadline, CompanyID: &companyID, CompanyName: &companyName,
		})
	}
	sort.SliceStable(items, func(i, j int) bool { return items[i].Date.Before(items[j].Date) })
	return items, nil
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, f Fields) (Item, error) {
	f.Title = platform.TrimPtr(f.Title)
	if f.Title == nil || *f.Title == "" {
		return Item{}, platform.Required("title", "タイトル")
	}
	if f.Date == nil {
		return Item{}, platform.Required("date", "日付")
	}
	eventType := db.CalendarEventTypeOther
	if f.Type != nil {
		eventType = *f.Type
	}
	t, err := toPgTime(f.Time)
	if err != nil {
		return Item{}, err
	}

	var item Item
	err = platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if f.CompanyID != nil {
			if err := company.EnsureOwned(ctx, q, userID, *f.CompanyID); err != nil {
				return err
			}
		}
		id, err := q.CreateCalendarEvent(ctx, db.CreateCalendarEventParams{
			UserID: userID, CompanyID: f.CompanyID, Title: *f.Title, Type: eventType, Date: *f.Date, Time: t,
			Url: platform.EmptyToNil(platform.TrimPtr(f.URL)),
		})
		if err != nil {
			return fmt.Errorf("create calendar event: %w", err)
		}
		item, err = get(ctx, q, userID, id)
		return err
	})
	return item, err
}

func (s *Service) Update(ctx context.Context, userID, id uuid.UUID, f Fields) (Item, error) {
	f.Title = platform.TrimPtr(f.Title)
	if f.Title != nil && *f.Title == "" {
		return Item{}, platform.Required("title", "タイトル")
	}
	t, err := toPgTime(f.Time)
	if err != nil {
		return Item{}, err
	}

	var item Item
	err = platform.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if f.SetCompanyID && f.CompanyID != nil {
			if err := company.EnsureOwned(ctx, q, userID, *f.CompanyID); err != nil {
				return err
			}
		}
		params := db.UpdateCalendarEventParams{
			ID: id, UserID: userID,
			SetCompanyID: f.SetCompanyID, CompanyID: f.CompanyID,
			SetTitle: f.Title != nil, Title: f.Title,
			SetType: f.Type != nil, Type: f.Type,
			SetDate: f.Date != nil, Date: f.Date,
			SetTime: f.SetTime, Time: t,
			SetUrl: f.SetURL, Url: platform.EmptyToNil(platform.TrimPtr(f.URL)),
		}
		n, err := q.UpdateCalendarEvent(ctx, params)
		if err != nil {
			return fmt.Errorf("update calendar event: %w", err)
		}
		if n == 0 {
			return notFound()
		}
		item, err = get(ctx, q, userID, id)
		return err
	})
	return item, err
}

func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	n, err := db.New(s.pool).DeleteCalendarEvent(ctx, db.DeleteCalendarEventParams{ID: id, UserID: userID})
	if err != nil {
		return fmt.Errorf("delete calendar event: %w", err)
	}
	if n == 0 {
		return notFound()
	}
	return nil
}

func get(ctx context.Context, q *db.Queries, userID, id uuid.UUID) (Item, error) {
	row, err := q.GetCalendarEvent(ctx, db.GetCalendarEventParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return Item{}, notFound()
	}
	if err != nil {
		return Item{}, fmt.Errorf("get calendar event: %w", err)
	}
	return fromEvent(row.CalendarEvent, row.CompanyName), nil
}

func fromEvent(e db.CalendarEvent, companyName *string) Item {
	return Item{
		ID: e.ID, Source: SourceEvent, Title: e.Title, Type: e.Type, Date: e.Date,
		Time: fromPgTime(e.Time), CompanyID: e.CompanyID, CompanyName: companyName, URL: e.Url,
	}
}

// toPgTime は、HH:MM の文字列をDBの time 型にする。形式は OpenAPI の pattern で検証済み。
func toPgTime(s *string) (pgtype.Time, error) {
	if s == nil {
		return pgtype.Time{}, nil
	}
	t, err := time.Parse("15:04", *s)
	if err != nil {
		return pgtype.Time{}, &platform.Error{
			Kind:    platform.KindInvalid,
			Message: "入力内容に誤りがあります",
			Fields:  []platform.FieldError{{Field: "time", Message: "時刻は HH:MM の形式で入力してください"}},
		}
	}
	return pgtype.Time{Microseconds: int64(t.Hour()*3600+t.Minute()*60) * 1_000_000, Valid: true}, nil
}

func fromPgTime(t pgtype.Time) *string {
	if !t.Valid {
		return nil
	}
	minutes := t.Microseconds / 60_000_000
	s := fmt.Sprintf("%02d:%02d", minutes/60, minutes%60)
	return &s
}

func notFound() *platform.Error {
	return &platform.Error{Kind: platform.KindNotFound, Message: "予定が見つかりません"}
}
