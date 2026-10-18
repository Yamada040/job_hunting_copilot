package ratelimit

import (
	"context"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// TrackCost は、gen の呼び出しのたびに、使ったトークン数の料金をアプリ全体の1日の利用料に足す Generator を返す。
// 各機能のサービスで足さずに Generator を包むのは、AIを呼ぶ経路を足したときに足し忘れないようにするため。
// 失敗した呼び出しでも、応答のトークン数が分かっていれば（AIの結果の形が違った・企業分析が途中で時間切れになったなど）足す。
func (l *Limiter) TrackCost(gen ai.Generator, conn db.DBTX) ai.Generator {
	return costTracker{gen: gen, limiter: l, q: db.New(conn)}
}

type costTracker struct {
	gen     ai.Generator
	limiter *Limiter
	q       *db.Queries
}

func (c costTracker) Generate(ctx context.Context, kind ai.Kind, input string) (string, ai.Usage, error) {
	text, usage, err := c.gen.Generate(ctx, kind, input)
	c.add(ctx, usage)
	return text, usage, err
}

func (c costTracker) GenerateJSON(ctx context.Context, kind ai.Kind, input string, out any) (ai.Usage, error) {
	usage, err := c.gen.GenerateJSON(ctx, kind, input, out)
	c.add(ctx, usage)
	return usage, err
}

func (c costTracker) AnalyzeCompany(ctx context.Context, input string) (string, ai.Usage, error) {
	text, usage, err := c.gen.AnalyzeCompany(ctx, input)
	c.add(ctx, usage)
	return text, usage, err
}

// add は、足せなくてもエラーを返さずログに残す。AIの費用はすでにかかっており、ここで失敗させると結果を捨てて同じ費用で再実行させてしまうため。
// 利用者が待たずに接続を切っても費用はかかっているので、リクエストの取り消しに巻き込まれないよう WithoutCancel で書き込む
func (c costTracker) add(ctx context.Context, usage ai.Usage) {
	if err := c.limiter.AddAICost(context.WithoutCancel(ctx), c.q, usage); err != nil {
		platform.Logger(ctx).Error("add ai cost failed", "error", err)
	}
}
