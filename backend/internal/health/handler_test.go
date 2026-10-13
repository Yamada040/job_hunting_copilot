package health

import (
	"context"
	"errors"
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

type fakePinger struct{ err error }

func (f fakePinger) Ping(context.Context) error { return f.err }

func TestGetHealthReturnsOKWhenDatabaseResponds(t *testing.T) {
	res, err := Handler{DB: fakePinger{}}.GetHealth(t.Context(), openapi.GetHealthRequestObject{})
	if err != nil {
		t.Fatalf("GetHealth: %v", err)
	}
	if got, ok := res.(openapi.GetHealth200JSONResponse); !ok || got.Status != openapi.Ok {
		t.Errorf("response = %#v, want 200 ok", res)
	}
}

func TestGetHealthReportsUnavailableWhenDatabaseFails(t *testing.T) {
	_, err := Handler{DB: fakePinger{err: errors.New("connection refused")}}.GetHealth(t.Context(), openapi.GetHealthRequestObject{})

	var appErr *platform.Error
	if !errors.As(err, &appErr) || appErr.Kind != platform.KindUnavailable {
		t.Errorf("error = %v, want KindUnavailable", err)
	}
}
