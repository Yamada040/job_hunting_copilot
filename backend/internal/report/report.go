// Package report は、1日の利用状況を運営の Slack に送る（毎日のまとめ）。
package report

import (
	"context"
	"crypto/subtle"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
)

var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

// lateness は、呼ばれた時刻から、集計する日を決めるときに戻す時間。
// 23:50 に呼ぶよう決めていても GitHub Actions の予定は遅れることがあり、日付が変わった後に呼ばれても前日を集計するため
const lateness = time.Hour

// SecretRejected は、合言葉の合わない呼び出し。GitHub Actions は合言葉を間違えないので、1回目から知らせる
var SecretRejected = platform.Alert{Name: "daily_report_secret_rejected", Message: "daily report called with a wrong secret"}

// Poster は、Slack に文章を送る（slack.Webhook）。テストでは偽物に差し替える。
type Poster interface {
	Post(ctx context.Context, text string) error
}

type Handler struct {
	Pool *pgxpool.Pool
	// Secret は、呼び出しに付ける合言葉。空なら 503
	Secret string
	// Slack は、送り先。nil なら 503
	Slack   Poster
	Limiter *ratelimit.Limiter
	Now     func() time.Time
}

func (h Handler) SendDailyReport(ctx context.Context, req openapi.SendDailyReportRequestObject) (openapi.SendDailyReportResponseObject, error) {
	if h.Secret == "" || h.Slack == nil {
		return nil, &platform.Error{Kind: platform.KindUnavailable, Message: "毎日のまとめの設定が完了していません。"}
	}
	// 合言葉を1文字ずつ当てられないよう、比べる時間を中身によらず同じにする
	if subtle.ConstantTimeCompare([]byte(req.Params.XReportSecret), []byte(h.Secret)) != 1 {
		platform.Notify(ctx, SecretRejected)
		return nil, &platform.Error{Kind: platform.KindUnauthorized, Message: "合言葉が違います"}
	}
	day := h.Now().Add(-lateness).In(jst)
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, jst)
	q := db.New(h.Pool)
	stats, err := q.GetDailyReport(ctx, db.GetDailyReportParams{DayStart: start, DayEnd: start.AddDate(0, 0, 1)})
	if err != nil {
		return nil, fmt.Errorf("get daily report: %w", err)
	}
	usage, err := h.Limiter.DailyUsageOn(ctx, q, start)
	if err != nil {
		return nil, err
	}
	if err := h.Slack.Post(ctx, format(start, stats, usage)); err != nil {
		return nil, fmt.Errorf("post daily report: %w", err)
	}
	return openapi.SendDailyReport204Response{}, nil
}

// format は、運営が Slack で読むまとめの文章を作る。
func format(day time.Time, s db.GetDailyReportRow, u ratelimit.DailyUsage) string {
	return strings.Join([]string{
		day.Format("2006/01/02") + " の利用状況",
		fmt.Sprintf("ユーザー: 合計 %d人（新規 %d人、XPが付く操作をした人 %d人）", s.TotalUsers, s.NewUsers, s.ActiveUsers),
		fmt.Sprintf("作成: ES %d件・企業 %d件・面接ログ %d件", s.NewEs, s.NewCompanies, s.NewInterviews),
		fmt.Sprintf("AI: 添削など %d/%d回・企業分析 %d/%d回", u.AI.Used, u.AI.Max, u.CompanyAnalysis.Used, u.CompanyAnalysis.Max),
		fmt.Sprintf("AIの利用料: $%.2f / $%.2f", float64(u.AICost.Used)/1e6, float64(u.AICost.Max)/1e6),
		fmt.Sprintf("問い合わせ: %d/%d通", u.Contact.Used, u.Contact.Max),
	}, "\n")
}
