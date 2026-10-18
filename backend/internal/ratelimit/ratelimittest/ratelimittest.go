// Package ratelimittest は、各機能のテスト用の Limiter を提供する。
package ratelimittest

import "github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"

// NewLimiter は、アプリ全体の上限では止まらない Limiter を返す。1人ごとの上限は本番と同じ。
// 本番の既定値にしないのは、アプリ全体の枠はテストのユーザーを消しても残り、手元で何度もテストすると同じ日のうちに上限に達してしまうため。
func NewLimiter() *ratelimit.Limiter {
	return ratelimit.NewLimiter(ratelimit.AppLimits{AIDaily: 1 << 30, CompanyAnalysisDaily: 1 << 30})
}
