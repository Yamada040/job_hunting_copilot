package webtest

import (
	"context"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

type Handler struct {
	Service *Service
}

func (h Handler) ListWebtestQuestions(ctx context.Context, req openapi.ListWebtestQuestionsRequestObject) (openapi.ListWebtestQuestionsResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := h.Service.List(ctx, userID, req.Params.TestType)
	if err != nil {
		return nil, err
	}
	res := make(openapi.ListWebtestQuestions200JSONResponse, len(rows))
	for i, r := range rows {
		res[i] = openapi.WebtestQuestionSummary{
			Id: r.ID, Title: r.Title, TestType: r.TestType, Category: r.Category, Format: r.Format,
			Difficulty: r.Difficulty, TimeLimit: intPtr(r.TimeLimit), CreatedAt: r.CreatedAt,
		}
	}
	return res, nil
}

func (h Handler) CreateWebtestQuestion(ctx context.Context, req openapi.CreateWebtestQuestionRequestObject) (openapi.CreateWebtestQuestionResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	n := NewQuestion{
		Title: b.Title, Body: b.Body, Answer: b.Answer, Explanation: b.Explanation,
		TestType: b.TestType, Category: b.Category, Format: b.Format, Difficulty: b.Difficulty, TimeLimit: b.TimeLimit,
	}
	if b.Choices != nil {
		n.Choices = *b.Choices
	}
	q, reward, err := h.Service.Create(ctx, userID, n)
	if err != nil {
		return nil, err
	}
	return openapi.CreateWebtestQuestion201JSONResponse{Question: toAPI(q), Xp: xp.ToAPI(reward)}, nil
}

func (h Handler) GetWebtestQuestion(ctx context.Context, req openapi.GetWebtestQuestionRequestObject) (openapi.GetWebtestQuestionResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	q, err := h.Service.Get(ctx, userID, req.WebtestQuestionId)
	if err != nil {
		return nil, err
	}
	return openapi.GetWebtestQuestion200JSONResponse(toAPI(q)), nil
}

func (h Handler) UpdateWebtestQuestion(ctx context.Context, req openapi.UpdateWebtestQuestionRequestObject) (openapi.UpdateWebtestQuestionResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	n := NewQuestion{
		Title: b.Title, Body: b.Body, Answer: b.Answer, Choices: b.Choices, Explanation: b.Explanation,
		TestType: b.TestType, Category: b.Category, Format: b.Format, Difficulty: b.Difficulty, TimeLimit: b.TimeLimit,
	}
	q, err := h.Service.Update(ctx, userID, req.WebtestQuestionId, n)
	if err != nil {
		return nil, err
	}
	return openapi.UpdateWebtestQuestion200JSONResponse(toAPI(q)), nil
}

func (h Handler) AnswerWebtestQuestion(ctx context.Context, req openapi.AnswerWebtestQuestionRequestObject) (openapi.AnswerWebtestQuestionResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	attempt, reward, err := h.Service.Answer(ctx, userID, req.WebtestQuestionId, req.Body.Answer, req.Body.TimeSpent)
	if err != nil {
		return nil, err
	}
	return openapi.AnswerWebtestQuestion201JSONResponse{Attempt: attemptToAPI(attempt), Xp: xp.ToAPI(reward)}, nil
}

func toAPI(q Question) openapi.WebtestQuestionDetail {
	attempts := make([]openapi.WebtestAttempt, len(q.Attempts))
	for i, a := range q.Attempts {
		attempts[i] = attemptToAPI(a)
	}
	return openapi.WebtestQuestionDetail{
		Id: q.ID, Title: q.Title, Body: q.Body, Answer: q.Answer, Choices: q.Choices, Explanation: q.Explanation,
		TestType: q.TestType, Category: q.Category, Format: q.Format, Difficulty: q.Difficulty,
		TimeLimit: intPtr(q.TimeLimit), CreatedAt: q.CreatedAt, Attempts: attempts,
	}
}

func attemptToAPI(a db.WebtestAttempt) openapi.WebtestAttempt {
	return openapi.WebtestAttempt{Id: a.ID, IsCorrect: a.IsCorrect != nil && *a.IsCorrect, TimeSpent: intPtr(a.TimeSpent), CreatedAt: a.CreatedAt}
}

func intPtr(v *int32) *int {
	if v == nil {
		return nil
	}
	n := int(*v)
	return &n
}
