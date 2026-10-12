package assessment

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/xp"
)

// 回答の型は、APIの型（openapi.yaml で項目を定義したもの）をそのまま使う。JSONとしてDBに保存する

func NewAptitudeService(pool *pgxpool.Pool, x *xp.Service, gen ai.Generator, limiter *ratelimit.Limiter) *Service[openapi.AptitudeAnswers] {
	return &Service[openapi.AptitudeAnswers]{pool: pool, xp: x, ai: gen, limiter: limiter, kind: kind[openapi.AptitudeAnswers]{
		label:    "適性診断",
		xpAction: db.XpActionAptitudeComplete,
		aiKind:   ai.KindAptitudeDiagnosis,
		aiInput:  aptitudeInput,
		table: table{
			get: func(ctx context.Context, q *db.Queries, userID uuid.UUID) (record, error) {
				r, err := q.GetAptitudeResult(ctx, userID)
				return record{ID: r.ID, Answers: r.Answers, AIResult: r.AiResult, CreatedAt: r.CreatedAt}, err
			},
			create: func(ctx context.Context, q *db.Queries, userID uuid.UUID, answers []byte) (int64, error) {
				return q.CreateAptitudeResult(ctx, db.CreateAptitudeResultParams{UserID: userID, Answers: answers})
			},
			setAIOnce: func(ctx context.Context, q *db.Queries, userID uuid.UUID, text string, usage ai.Usage) (int64, error) {
				input, output := usage.ColumnValues()
				return q.SetAptitudeAiResultOnce(ctx, db.SetAptitudeAiResultOnceParams{UserID: userID, AiResult: &text, AiInputTokens: input, AiOutputTokens: output})
			},
		},
	}}
}

func NewSelfAnalysisService(pool *pgxpool.Pool, x *xp.Service, gen ai.Generator, limiter *ratelimit.Limiter) *Service[openapi.SelfAnalysisAnswers] {
	return &Service[openapi.SelfAnalysisAnswers]{pool: pool, xp: x, ai: gen, limiter: limiter, kind: kind[openapi.SelfAnalysisAnswers]{
		label:    "自己分析",
		xpAction: db.XpActionSelfAnalysisComplete,
		aiKind:   ai.KindSelfAnalysis,
		aiInput:  selfAnalysisInput,
		table: table{
			get: func(ctx context.Context, q *db.Queries, userID uuid.UUID) (record, error) {
				r, err := q.GetSelfAnalysisResult(ctx, userID)
				return record{ID: r.ID, Answers: r.Answers, AIResult: r.AiResult, CreatedAt: r.CreatedAt}, err
			},
			create: func(ctx context.Context, q *db.Queries, userID uuid.UUID, answers []byte) (int64, error) {
				return q.CreateSelfAnalysisResult(ctx, db.CreateSelfAnalysisResultParams{UserID: userID, Answers: answers})
			},
			setAIOnce: func(ctx context.Context, q *db.Queries, userID uuid.UUID, text string, usage ai.Usage) (int64, error) {
				input, output := usage.ColumnValues()
				return q.SetSelfAnalysisAiResultOnce(ctx, db.SetSelfAnalysisAiResultOnceParams{UserID: userID, AiResult: &text, AiInputTokens: input, AiOutputTokens: output})
			},
		},
	}}
}

func aptitudeInput(a openapi.AptitudeAnswers) string {
	return lines(
		"興味のある領域", list(a.Interests),
		"強み", list(a.Strengths),
		"価値観", list(a.Values),
		"好きな業務/没頭できること", a.Enjoy,
		"誇りに思う達成", a.Achievements,
		"苦手・避けたいこと", a.Dislike,
		"働き方の希望", a.WorkStyle,
		"希望勤務地/働き方", a.Location,
		"興味のある業界", a.IndustryWish,
		"興味のある職種", a.RoleWish,
		"MBTI", a.Mbti,
		"補足メモ", a.OtherNotes,
	)
}

func selfAnalysisInput(a openapi.SelfAnalysisAnswers) string {
	return lines(
		"強み", a.Strengths,
		"価値観", a.Values,
		"モチベーション源泉", a.Motivation,
		"成功体験", a.Successes,
		"失敗体験・学び", a.Failures,
		"働き方の好み", a.WorkStyle,
		"将来像（3-5年）", a.Future,
	)
}

// lines は、「項目名: 回答」の行を並べる。未記入の項目は「未記入」と明示する（AIに推測させないため）。
func lines(pairs ...string) string {
	out := make([]string, 0, len(pairs)/2)
	for i := 0; i+1 < len(pairs); i += 2 {
		value := strings.TrimSpace(pairs[i+1])
		if value == "" {
			value = "未記入"
		}
		out = append(out, fmt.Sprintf("%s: %s", pairs[i], value))
	}
	return strings.Join(out, "\n")
}

func list(items []string) string {
	return strings.Join(items, ", ")
}
