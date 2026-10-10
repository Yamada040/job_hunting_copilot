package xp

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/auth"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
)

// 一覧で件数の指定がないときの上限
const defaultLogLimit = 100

// Handler は、XPの獲得履歴のAPIを持つ。
type Handler struct {
	Pool *pgxpool.Pool
}

func (h Handler) ListXpLogs(ctx context.Context, req openapi.ListXpLogsRequestObject) (openapi.ListXpLogsResponseObject, error) {
	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		return nil, err
	}
	limit := defaultLogLimit
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}
	rows, err := db.New(h.Pool).ListXPLogs(ctx, db.ListXPLogsParams{UserID: userID, MaxRows: int32(limit)})
	if err != nil {
		return nil, fmt.Errorf("list xp logs: %w", err)
	}
	res := make(openapi.ListXpLogs200JSONResponse, len(rows))
	for i, row := range rows {
		res[i] = openapi.XpLog{Xp: int(row.Xp), Action: openapi.XpAction(row.Action), CreatedAt: row.CreatedAt}
	}
	return res, nil
}
