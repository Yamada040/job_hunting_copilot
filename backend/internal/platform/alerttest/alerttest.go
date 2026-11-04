// Package alerttest は、テストで platform.Notify に渡された Alert を記録する偽物を持つ。
package alerttest

import (
	"context"
	"sync"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// Recorder は、数えずに Alert の名前を記録する platform.Alerter。
type Recorder struct {
	mu    sync.Mutex
	names []string
}

func (r *Recorder) Notify(_ context.Context, a platform.Alert) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.names = append(r.names, a.Name)
}

// Names は、記録した Alert の名前を、記録した順に返す。
func (r *Recorder) Names() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string{}, r.names...)
}

// Context は、ctx の中の Notify を記録する Recorder と、そのコンテキストを返す。
func Context(ctx context.Context) (context.Context, *Recorder) {
	r := &Recorder{}
	return platform.WithAlerter(ctx, r), r
}
