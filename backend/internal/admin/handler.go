// Package admin は、開発者向けの利用状況の集計を扱う。全ユーザーのデータを数えるので、開発者だけが使える。
package admin

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/google/uuid"
)

var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

type Handler struct {
	Pool *pgxpool.Pool
	// IsDeveloper は、ユーザーが開発者かを返す（profile.Service.IsDeveloper）
	IsDeveloper func(uuid.UUID) bool
	Now         func() time.Time
}

func (h Handler) GetAdminStats(ctx context.Context, _ openapi.GetAdminStatsRequestObject) (openapi.GetAdminStatsResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	if !h.IsDeveloper(userID) {
		return nil, &platform.Error{Kind: platform.KindForbidden, Message: "このページは開発者のみ利用できます"}
	}
	now := h.Now().In(jst)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jst)
	row, err := db.New(h.Pool).GetAdminStats(ctx, db.GetAdminStatsParams{Since: now.AddDate(0, 0, -7), TodayStart: today})
	if err != nil {
		return nil, fmt.Errorf("get admin stats: %w", err)
	}
	return openapi.GetAdminStats200JSONResponse{
		TotalUsers: int(row.TotalUsers), NewUsers7d: int(row.NewUsers),
		ActiveUsers7d: int(row.ActiveUsers), ActiveUsersToday: int(row.ActiveUsersToday),
		TotalEs: int(row.TotalEs), EsCreated7d: int(row.NewEs),
		TotalCompanies: int(row.TotalCompanies), CompaniesCreated7d: int(row.NewCompanies),
		TotalInterviews: int(row.TotalInterviews), InterviewsCreated7d: int(row.NewInterviews),
	}, nil
}
