// Package aitest は、テスト用に AI の代わりを務める偽物を提供する。
package aitest

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
)

// Fake は、受け取った入力を記録し、Reply を返す（Err があればそれを返す）。GenerateJSON では Reply をJSONとして読む。
type Fake struct {
	Reply string
	Usage ai.Usage
	Err   error

	mu     sync.Mutex
	Inputs []string
}

func (f *Fake) Generate(_ context.Context, _ ai.Kind, input string) (string, ai.Usage, error) {
	reply, err := f.record(input)
	return reply, f.Usage, err
}

func (f *Fake) GenerateJSON(_ context.Context, _ ai.Kind, input string, out any) (ai.Usage, error) {
	reply, err := f.record(input)
	if err != nil {
		return ai.Usage{}, err
	}
	return f.Usage, json.Unmarshal([]byte(reply), out)
}

func (f *Fake) AnalyzeCompany(_ context.Context, input string) (string, ai.Usage, error) {
	reply, err := f.record(input)
	return reply, f.Usage, err
}

func (f *Fake) record(input string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.Inputs = append(f.Inputs, input)
	return f.Reply, f.Err
}
