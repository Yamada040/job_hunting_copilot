// Package health は稼働確認のAPIを持つ。
package health

import (
	"context"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
)

type Handler struct{}

func (Handler) GetHealth(context.Context, openapi.GetHealthRequestObject) (openapi.GetHealthResponseObject, error) {
	return openapi.GetHealth200JSONResponse{Status: openapi.Ok}, nil
}
