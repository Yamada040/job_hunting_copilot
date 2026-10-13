package calendar

import (
	"context"
	"strings"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
)

func (h Handler) GetCalendarFeed(ctx context.Context, _ openapi.GetCalendarFeedRequestObject) (openapi.GetCalendarFeedResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	status, err := h.Service.FeedStatus(ctx, userID)
	if err != nil {
		return nil, err
	}
	return openapi.GetCalendarFeed200JSONResponse{Enabled: status.Enabled, CreatedAt: status.CreatedAt}, nil
}

func (h Handler) CreateCalendarFeed(ctx context.Context, _ openapi.CreateCalendarFeedRequestObject) (openapi.CreateCalendarFeedResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	token, createdAt, err := h.Service.CreateFeed(ctx, userID)
	if err != nil {
		return nil, err
	}
	return openapi.CreateCalendarFeed201JSONResponse{Token: token, CreatedAt: createdAt}, nil
}

func (h Handler) DeleteCalendarFeed(ctx context.Context, _ openapi.DeleteCalendarFeedRequestObject) (openapi.DeleteCalendarFeedResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.Service.DeleteFeed(ctx, userID); err != nil {
		return nil, err
	}
	return openapi.DeleteCalendarFeed204Response{}, nil
}

// GetCalendarFeedIcal は、ログインせずに読める購読用URL。本人かどうかはURLの中のトークンだけで決める。
func (h Handler) GetCalendarFeedIcal(ctx context.Context, req openapi.GetCalendarFeedIcalRequestObject) (openapi.GetCalendarFeedIcalResponseObject, error) {
	items, err := h.Service.FeedItems(ctx, req.Token)
	if err != nil {
		return nil, err
	}
	body := BuildICal(items, time.Now())
	return openapi.GetCalendarFeedIcal200TextcalendarResponse{Body: strings.NewReader(body), ContentLength: int64(len(body))}, nil
}
