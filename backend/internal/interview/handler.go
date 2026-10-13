package interview

import (
	"context"

	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

type Handler struct {
	Service *Service
}

func (h Handler) ListInterviewLogs(ctx context.Context, req openapi.ListInterviewLogsRequestObject) (openapi.ListInterviewLogsResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	limit := 0
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}
	logs, err := h.Service.List(ctx, userID, req.Params.CompanyId, limit)
	if err != nil {
		return nil, err
	}
	res := make(openapi.ListInterviewLogs200JSONResponse, len(logs))
	for i, l := range logs {
		res[i] = toAPI(l)
	}
	return res, nil
}

func (h Handler) CreateInterviewLog(ctx context.Context, req openapi.CreateInterviewLogRequestObject) (openapi.CreateInterviewLogResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	questions := fromAPIQuestions(b.Questions)
	log, reward, err := h.Service.Create(ctx, userID, Fields{
		CompanyID:     &b.CompanyId,
		Format:        (*db.InterviewFormat)(&b.Format),
		Round:         &b.Round,
		InterviewDate: &b.InterviewDate.Time,
		Questions:     &questions,
		Improvement:   b.Improvement,
		Unexpected:    b.Unexpected,
	})
	if err != nil {
		return nil, err
	}
	return openapi.CreateInterviewLog201JSONResponse{InterviewLog: toAPI(log), Xp: xp.ToAPI(reward)}, nil
}

func (h Handler) GetInterviewLog(ctx context.Context, req openapi.GetInterviewLogRequestObject) (openapi.GetInterviewLogResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	log, err := h.Service.Get(ctx, userID, req.InterviewLogId)
	if err != nil {
		return nil, err
	}
	return openapi.GetInterviewLog200JSONResponse(toAPI(log)), nil
}

func (h Handler) UpdateInterviewLog(ctx context.Context, req openapi.UpdateInterviewLogRequestObject) (openapi.UpdateInterviewLogResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	f := Fields{
		CompanyID:   b.CompanyId,
		Format:      (*db.InterviewFormat)(b.Format),
		Round:       b.Round,
		Improvement: b.Improvement,
		Unexpected:  b.Unexpected,
	}
	if b.InterviewDate != nil {
		f.InterviewDate = &b.InterviewDate.Time
	}
	if b.Questions != nil {
		questions := fromAPIQuestions(*b.Questions)
		f.Questions = &questions
	}
	log, err := h.Service.Update(ctx, userID, req.InterviewLogId, f)
	if err != nil {
		return nil, err
	}
	return openapi.UpdateInterviewLog200JSONResponse(toAPI(log)), nil
}

func (h Handler) ReviewInterviewLog(ctx context.Context, req openapi.ReviewInterviewLogRequestObject) (openapi.ReviewInterviewLogResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	log, err := h.Service.Review(ctx, userID, req.InterviewLogId)
	if err != nil {
		return nil, err
	}
	return openapi.ReviewInterviewLog200JSONResponse(toAPI(log)), nil
}

func (h Handler) DeleteInterviewLog(ctx context.Context, req openapi.DeleteInterviewLogRequestObject) (openapi.DeleteInterviewLogResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.Service.Delete(ctx, userID, req.InterviewLogId); err != nil {
		return nil, err
	}
	return openapi.DeleteInterviewLog204Response{}, nil
}

func fromAPIQuestions(qs []openapi.InterviewQuestion) []Question {
	out := make([]Question, len(qs))
	for i, q := range qs {
		out[i] = Question{Question: q.Question, Answer: q.Answer}
		if q.Rating != nil {
			out[i].Rating = string(*q.Rating)
		}
	}
	return out
}

func toAPI(l Log) openapi.InterviewLog {
	questions := make([]openapi.InterviewQuestion, len(l.Questions))
	for i, q := range l.Questions {
		questions[i] = openapi.InterviewQuestion{Question: q.Question, Answer: q.Answer}
		if q.Rating != "" {
			r := openapi.InterviewRating(q.Rating)
			questions[i].Rating = &r
		}
	}
	var date *openapi_types.Date
	if l.InterviewDate != nil {
		date = &openapi_types.Date{Time: *l.InterviewDate}
	}
	return openapi.InterviewLog{
		Id:            l.ID,
		Company:       openapi.CompanySummary{Id: l.CompanyID, Name: l.CompanyName},
		Format:        (*openapi.InterviewFormat)(l.Format),
		Round:         l.Round,
		InterviewDate: date,
		Questions:     questions,
		Improvement:   l.Improvement,
		Unexpected:    l.Unexpected,
		AiResult:      l.AiResult,
		CreatedAt:     l.CreatedAt,
		UpdatedAt:     l.UpdatedAt,
	}
}
