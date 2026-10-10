// Package health は稼働確認のAPIを持つ。
package health

import (
	"context"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// DBに応答がないときに、稼働確認そのものが長く待たされないようにする
const pingTimeout = 3 * time.Second

// Pinger は、DBに接続できるかを確かめる。*pgxpool.Pool が満たす。
type Pinger interface {
	Ping(ctx context.Context) error
}

type Handler struct {
	DB Pinger
}

// GetHealth は、サーバーが動いていてDBにも接続できるかを返す。
// DBに問い合わせるので、Supabase の無料プランの一時停止を防ぐ定期アクセスの宛先にも使える。
func (h Handler) GetHealth(ctx context.Context, _ openapi.GetHealthRequestObject) (openapi.GetHealthResponseObject, error) {
	ctx, cancel := context.WithTimeout(ctx, pingTimeout)
	defer cancel()
	if err := h.DB.Ping(ctx); err != nil {
		platform.Logger(ctx).Error("database ping failed", "error", err)
		return nil, &platform.Error{Kind: platform.KindUnavailable, Message: "データベースに接続できません"}
	}
	return openapi.GetHealth200JSONResponse{Status: openapi.Ok}, nil
}
