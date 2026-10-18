package profile

import (
	"context"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
)

type Handler struct {
	Service *Service
}

func (h Handler) GetMe(ctx context.Context, _ openapi.GetMeRequestObject) (openapi.GetMeResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	p, err := h.Service.Get(ctx, userID)
	if err != nil {
		return nil, err
	}
	return openapi.GetMe200JSONResponse(h.toMe(p)), nil
}

func (h Handler) UpdateMe(ctx context.Context, req openapi.UpdateMeRequestObject) (openapi.UpdateMeResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	p, err := h.Service.Update(ctx, userID, Update{
		FullName:       req.Body.FullName,
		University:     req.Body.University,
		Faculty:        req.Body.Faculty,
		AvatarID:       req.Body.AvatarId,
		TargetIndustry: req.Body.TargetIndustry,
		CareerAxis:     req.Body.CareerAxis,
		GoalState:      req.Body.GoalState,
	})
	if err != nil {
		return nil, err
	}
	return openapi.UpdateMe200JSONResponse(h.toMe(p)), nil
}

func (h Handler) DeleteMe(ctx context.Context, _ openapi.DeleteMeRequestObject) (openapi.DeleteMeResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.Service.Delete(ctx, userID); err != nil {
		return nil, err
	}
	return openapi.DeleteMe204Response{}, nil
}

func (h Handler) toMe(p Profile) openapi.Me {
	return openapi.Me{
		Id:             p.ID,
		FullName:       p.FullName,
		University:     p.University,
		Faculty:        p.Faculty,
		AvatarId:       p.AvatarID,
		TargetIndustry: p.TargetIndustry,
		CareerAxis:     p.CareerAxis,
		GoalState:      p.GoalState,
		Xp:             p.XP,
		Level:          p.Level,
		IsDeveloper:    h.Service.IsDeveloper(p.ID),
	}
}
