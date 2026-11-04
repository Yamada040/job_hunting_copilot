package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
)

// Usage は、アプリ全体の1つの枠の、ある1日の量と上限。
type Usage struct {
	Used int
	Max  int
}

// DailyUsage は、アプリ全体の枠の、ある1日（日本時間）の使われ方。毎日のまとめ（internal/report）で運営に見せる。
type DailyUsage struct {
	AI              Usage
	CompanyAnalysis Usage
	// AICost は、AIの利用料。単位はマイクロドル
	AICost  Usage
	Contact Usage
}

// DailyUsageOn は、day を含む日本時間の1日の、アプリ全体の枠の量を返す。
// 枠は1日ごとに同じ行を数え直すので、その日の後に一度でも数えていれば、その日の分は残っておらず0になる
func (l *Limiter) DailyUsageOn(ctx context.Context, q *db.Queries, day time.Time) (DailyUsage, error) {
	start := windowStart(Rule{Daily: true}, day)
	end := start.AddDate(0, 0, 1)
	read := func(r Rule) (Usage, error) {
		used, err := q.GetAppRateLimitOn(ctx, db.GetAppRateLimitOnParams{Bucket: r.Bucket, WindowStart: start, WindowEnd: end})
		if err != nil {
			return Usage{}, fmt.Errorf("get %s: %w", r.Bucket, err)
		}
		return Usage{Used: int(used), Max: r.Max}, nil
	}
	var u DailyUsage
	var err error
	if u.AI, err = read(l.aiAppDaily); err != nil {
		return DailyUsage{}, err
	}
	if u.CompanyAnalysis, err = read(l.companyAnalysisAppDaily); err != nil {
		return DailyUsage{}, err
	}
	if u.AICost, err = read(l.aiCostDaily); err != nil {
		return DailyUsage{}, err
	}
	if u.Contact, err = read(ContactAppDaily); err != nil {
		return DailyUsage{}, err
	}
	return u, nil
}
