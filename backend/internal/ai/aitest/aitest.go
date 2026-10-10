// Package aitest は、テスト用に AI の代わりを務める偽物を提供する。
package aitest

import (
	"context"
	"sync"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
)

// Fake は、受け取った入力を記録し、Reply を返す（Err があればそれを返す）。
type Fake struct {
	Reply string
	Err   error

	mu     sync.Mutex
	Inputs []string
}

func (f *Fake) Generate(_ context.Context, _ ai.Kind, input string) (string, error) {
	return f.record(input)
}

func (f *Fake) AnalyzeCompany(_ context.Context, input string) (string, error) {
	return f.record(input)
}

func (f *Fake) record(input string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Inputs = append(f.Inputs, input)
	return f.Reply, f.Err
}
