package es

import (
	"context"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

type Handler struct {
	Service *Service
}

func (h Handler) ListEsEntries(ctx context.Context, req openapi.ListEsEntriesRequestObject) (openapi.ListEsEntriesResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	limit := 0
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}
	entries, err := h.Service.List(ctx, userID, req.Params.CompanyId, limit)
	if err != nil {
		return nil, err
	}
	res := make(openapi.ListEsEntries200JSONResponse, len(entries))
	for i, e := range entries {
		res[i] = toAPI(e)
	}
	return res, nil
}

func (h Handler) CreateEsEntry(ctx context.Context, req openapi.CreateEsEntryRequestObject) (openapi.CreateEsEntryResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	f := Fields{
		CompanyID: &b.CompanyId,
		Title:     &b.Title,
		Position:  b.Position,
		Questions: fromAPIQuestions(b.Questions),
		ContentMd: b.ContentMd,
		Tags:      b.Tags,
		Memo:      b.Memo,
	}
	if b.Deadline != nil {
		f.Deadline = &b.Deadline.Time
	}
	entry, err := h.Service.Create(ctx, userID, f)
	if err != nil {
		return nil, err
	}
	return openapi.CreateEsEntry201JSONResponse(toAPI(entry)), nil
}

func (h Handler) GetEsEntry(ctx context.Context, req openapi.GetEsEntryRequestObject) (openapi.GetEsEntryResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	entry, err := h.Service.Get(ctx, userID, req.EsEntryId)
	if err != nil {
		return nil, err
	}
	return openapi.GetEsEntry200JSONResponse(toAPI(entry)), nil
}

func (h Handler) UpdateEsEntry(ctx context.Context, req openapi.UpdateEsEntryRequestObject) (openapi.UpdateEsEntryResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	f := Fields{
		CompanyID:   b.CompanyId,
		Title:       b.Title,
		Position:    b.Position,
		Questions:   fromAPIQuestions(b.Questions),
		ContentMd:   b.ContentMd,
		Tags:        b.Tags,
		Memo:        b.Memo,
		SetDeadline: b.Deadline.IsSpecified(),
	}
	if b.Deadline.IsSpecified() && !b.Deadline.IsNull() {
		d, err := time.Parse(time.DateOnly, b.Deadline.MustGet())
		if err != nil {
			return nil, &platform.Error{
				Kind:    platform.KindInvalid,
				Message: "入力内容に誤りがあります",
				Fields:  []platform.FieldError{{Field: "deadline", Message: "日付の形式が正しくありません"}},
			}
		}
		f.Deadline = &d
	}
	entry, err := h.Service.Update(ctx, userID, req.EsEntryId, f)
	if err != nil {
		return nil, err
	}
	return openapi.UpdateEsEntry200JSONResponse(toAPI(entry)), nil
}

func (h Handler) SubmitEsEntry(ctx context.Context, req openapi.SubmitEsEntryRequestObject) (openapi.SubmitEsEntryResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	entry, reward, err := h.Service.Submit(ctx, userID, req.EsEntryId)
	if err != nil {
		return nil, err
	}
	return openapi.SubmitEsEntry200JSONResponse{EsEntry: toAPI(entry), Xp: xp.ToAPI(reward)}, nil
}

func (h Handler) ReviewEsEntry(ctx context.Context, req openapi.ReviewEsEntryRequestObject) (openapi.ReviewEsEntryResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	entry, err := h.Service.Review(ctx, userID, req.EsEntryId)
	if err != nil {
		return nil, err
	}
	return openapi.ReviewEsEntry200JSONResponse(toAPI(entry)), nil
}

func (h Handler) DeleteEsEntry(ctx context.Context, req openapi.DeleteEsEntryRequestObject) (openapi.DeleteEsEntryResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.Service.Delete(ctx, userID, req.EsEntryId); err != nil {
		return nil, err
	}
	return openapi.DeleteEsEntry204Response{}, nil
}

func fromAPIQuestions(qs *[]openapi.EsQuestion) *[]Question {
	if qs == nil {
		return nil
	}
	out := make([]Question, len(*qs))
	for i, q := range *qs {
		out[i] = Question{Prompt: q.Prompt, Answer: q.Answer}
	}
	return &out
}

func toAPI(e Entry) openapi.EsEntry {
	questions := make([]openapi.EsQuestion, len(e.Questions))
	for i, q := range e.Questions {
		questions[i] = openapi.EsQuestion{Prompt: q.Prompt, Answer: q.Answer}
	}
	var deadline *openapi_types.Date
	if e.Deadline != nil {
		deadline = &openapi_types.Date{Time: *e.Deadline}
	}
	title := ""
	if e.Title != nil {
		title = *e.Title
	}
	return openapi.EsEntry{
		Id:        e.ID,
		Company:   openapi.CompanySummary{Id: e.CompanyID, Name: e.CompanyName},
		Position:  e.Position,
		Title:     title,
		Status:    openapi.EsStatus(e.Status),
		Questions: questions,
		ContentMd: e.ContentMd,
		Tags:      e.Tags,
		Deadline:  deadline,
		Memo:      e.Memo,
		AiResult:  e.AiResult,
		CreatedAt: e.CreatedAt,
		UpdatedAt: e.UpdatedAt,
	}
}
