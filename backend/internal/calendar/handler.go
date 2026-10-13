package calendar

import (
	"context"
	"time"

	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

type Handler struct {
	Service *Service
}

func (h Handler) ListCalendarItems(ctx context.Context, req openapi.ListCalendarItemsRequestObject) (openapi.ListCalendarItemsResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	items, err := h.Service.List(ctx, userID, dateOrNil(req.Params.From), dateOrNil(req.Params.To))
	if err != nil {
		return nil, err
	}
	res := make(openapi.ListCalendarItems200JSONResponse, len(items))
	for i, item := range items {
		res[i] = toAPI(item)
	}
	return res, nil
}

func (h Handler) CreateCalendarEvent(ctx context.Context, req openapi.CreateCalendarEventRequestObject) (openapi.CreateCalendarEventResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	item, err := h.Service.Create(ctx, userID, Fields{
		Title:     &b.Title,
		Type:      (*db.CalendarEventType)(b.Type),
		Date:      &b.Date.Time,
		EndDate:   dateOrNil(b.EndDate),
		Time:      b.Time,
		CompanyID: b.CompanyId,
		URL:       b.Url,
		Note:      b.Note,
	})
	if err != nil {
		return nil, err
	}
	return openapi.CreateCalendarEvent201JSONResponse(toAPI(item)), nil
}

func (h Handler) UpdateCalendarEvent(ctx context.Context, req openapi.UpdateCalendarEventRequestObject) (openapi.UpdateCalendarEventResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	f := Fields{
		Title:        b.Title,
		Type:         (*db.CalendarEventType)(b.Type),
		Date:         dateOrNil(b.Date),
		SetTime:      b.Time.IsSpecified(),
		SetCompanyID: b.CompanyId.IsSpecified(),
		SetURL:       b.Url.IsSpecified(),
		SetEndDate:   b.EndDate.IsSpecified(),
		SetNote:      b.Note.IsSpecified(),
	}
	if b.EndDate.IsSpecified() && !b.EndDate.IsNull() {
		d, err := time.Parse(time.DateOnly, b.EndDate.MustGet())
		if err != nil {
			return nil, &platform.Error{
				Kind:    platform.KindInvalid,
				Message: "入力内容に誤りがあります",
				Fields:  []platform.FieldError{{Field: "endDate", Message: "日付の形式が正しくありません"}},
			}
		}
		f.EndDate = &d
	}
	if b.Url.IsSpecified() && !b.Url.IsNull() {
		u := b.Url.MustGet()
		f.URL = &u
	}
	if b.Note.IsSpecified() && !b.Note.IsNull() {
		n := b.Note.MustGet()
		f.Note = &n
	}
	if b.Time.IsSpecified() && !b.Time.IsNull() {
		t := b.Time.MustGet()
		f.Time = &t
	}
	if b.CompanyId.IsSpecified() && !b.CompanyId.IsNull() {
		id, err := uuid.Parse(b.CompanyId.MustGet())
		if err != nil {
			return nil, &platform.Error{
				Kind:    platform.KindInvalid,
				Message: "入力内容に誤りがあります",
				Fields:  []platform.FieldError{{Field: "companyId", Message: "企業が見つかりません"}},
			}
		}
		f.CompanyID = &id
	}
	item, err := h.Service.Update(ctx, userID, req.CalendarEventId, f)
	if err != nil {
		return nil, err
	}
	return openapi.UpdateCalendarEvent200JSONResponse(toAPI(item)), nil
}

func (h Handler) DeleteCalendarEvent(ctx context.Context, req openapi.DeleteCalendarEventRequestObject) (openapi.DeleteCalendarEventResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.Service.Delete(ctx, userID, req.CalendarEventId); err != nil {
		return nil, err
	}
	return openapi.DeleteCalendarEvent204Response{}, nil
}

func dateOrNil(d *openapi_types.Date) *time.Time {
	if d == nil {
		return nil
	}
	return &d.Time
}

func toAPI(item Item) openapi.CalendarItem {
	var company *openapi.CompanySummary
	if item.CompanyID != nil && item.CompanyName != nil {
		company = &openapi.CompanySummary{Id: *item.CompanyID, Name: *item.CompanyName}
	}
	return openapi.CalendarItem{
		Id:      item.ID,
		Source:  openapi.CalendarItemSource(item.Source),
		Title:   item.Title,
		Type:    openapi.CalendarEventType(item.Type),
		Date:    openapi_types.Date{Time: item.Date},
		EndDate: dateOrNilAPI(item.EndDate),
		Time:    item.Time,
		Company: company,
		Url:     item.URL,
		Note:    item.Note,
	}
}

func dateOrNilAPI(d *time.Time) *openapi_types.Date {
	if d == nil {
		return nil
	}
	return &openapi_types.Date{Time: *d}
}
