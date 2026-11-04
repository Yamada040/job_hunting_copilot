package report

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/dbtest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/openapi"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform/alerttest"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/ratelimit"
)

// slackBox は、送った文章を貯める偽物の Poster。
type slackBox struct {
	texts []string
}

func (b *slackBox) Post(_ context.Context, text string) error {
	b.texts = append(b.texts, text)
	return nil
}

func request(secret string) openapi.SendDailyReportRequestObject {
	return openapi.SendDailyReportRequestObject{Params: openapi.SendDailyReportParams{XReportSecret: secret}}
}

func errorKind(err error) platform.Kind {
	var appErr *platform.Error
	if errors.As(err, &appErr) {
		return appErr.Kind
	}
	return 0
}

func TestWithoutSecretOrSlackIsUnavailable(t *testing.T) {
	for _, h := range []Handler{
		{Secret: "", Slack: &slackBox{}},
		{Secret: "s", Slack: nil},
	} {
		if _, err := h.SendDailyReport(t.Context(), request("s")); errorKind(err) != platform.KindUnavailable {
			t.Errorf("error = %v, want unavailable", err)
		}
	}
}

func TestWrongSecretIsRejectedAndAlerted(t *testing.T) {
	box := &slackBox{}
	h := Handler{Secret: "right", Slack: box}
	ctx, alerts := alerttest.Context(t.Context())

	_, err := h.SendDailyReport(ctx, request("wrong"))

	if errorKind(err) != platform.KindUnauthorized {
		t.Errorf("error = %v, want unauthorized", err)
	}
	if len(box.texts) != 0 {
		t.Errorf("sent %q, want nothing", box.texts)
	}
	if got := alerts.Names(); len(got) != 1 || got[0] != SecretRejected.Name {
		t.Errorf("alerts = %v, want the wrong secret counted", got)
	}
}

func TestReportCountsTheDayAnHourBeforeTheCall(t *testing.T) {
	pool := dbtest.Connect(t)
	userID := dbtest.CreateUser(t, pool)
	if _, err := pool.Exec(t.Context(), `insert into profiles (id, created_at) values ($1, $2)`, userID, time.Date(2026, 11, 3, 12, 0, 0, 0, jst)); err != nil {
		t.Fatalf("insert profile: %v", err)
	}
	box := &slackBox{}
	// 日付が変わった後の 00:30 に呼ばれても、前日（11/3）を集計する
	h := Handler{Pool: pool, Secret: "s", Slack: box, Limiter: ratelimit.NewLimiter(ratelimit.DefaultAppLimits),
		Now: func() time.Time { return time.Date(2026, 11, 4, 0, 30, 0, 0, jst) }}

	if _, err := h.SendDailyReport(t.Context(), request("s")); err != nil {
		t.Fatalf("SendDailyReport: %v", err)
	}

	if len(box.texts) != 1 {
		t.Fatalf("sent %d messages, want 1", len(box.texts))
	}
	text := box.texts[0]
	if !strings.HasPrefix(text, "2026/11/03 の利用状況") {
		t.Errorf("text = %q, want the report for 2026/11/03", text)
	}
	if strings.Contains(text, "新規 0人") {
		t.Errorf("text = %q, want the user created on 2026/11/03 counted", text)
	}
}

func TestFormatShowsUsageAgainstLimits(t *testing.T) {
	text := format(time.Date(2026, 11, 4, 0, 0, 0, 0, jst),
		db.GetDailyReportRow{TotalUsers: 12, NewUsers: 3, ActiveUsers: 5, NewEs: 4, NewCompanies: 2, NewInterviews: 1},
		ratelimit.DailyUsage{
			AI:              ratelimit.Usage{Used: 20, Max: 300},
			CompanyAnalysis: ratelimit.Usage{Used: 2, Max: 10},
			AICost:          ratelimit.Usage{Used: 125_000, Max: 1_000_000},
			Contact:         ratelimit.Usage{Used: 1, Max: 50},
		})

	want := strings.Join([]string{
		"2026/11/04 の利用状況",
		"ユーザー: 合計 12人（新規 3人、XPが付く操作をした人 5人）",
		"作成: ES 4件・企業 2件・面接ログ 1件",
		"AI: 添削など 20/300回・企業分析 2/10回",
		"AIの利用料: $0.12 / $1.00",
		"問い合わせ: 1/50通",
	}, "\n")
	if text != want {
		t.Errorf("text =\n%s\nwant\n%s", text, want)
	}
}
