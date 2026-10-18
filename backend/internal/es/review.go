package es

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/ai"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// Score は、1つの観点の点数（1〜10）とコメント。判断する情報が無ければ Value は nil。
type Score struct {
	Value   *int   `json:"score"`
	Comment string `json:"comment"`
}

// ReviewItem は、設問または本文1つ分の添削結果。添削したときの設問・回答・上限も残し、後から推移を見比べられるようにする。
type ReviewItem struct {
	// Source は "question"（設問）か "body"（本文）
	Source      string  `json:"source"`
	Prompt      *string `json:"prompt"`
	Answer      string  `json:"answer"`
	CharLimit   *int    `json:"charLimit"`
	Structure   Score   `json:"structure"`
	Specificity Score   `json:"specificity"`
	CompanyFit  Score   `json:"companyFit"`
	Improvement string  `json:"improvement"`
	Rewrite     string  `json:"rewrite"`
}

// ReviewResult は、es_reviews.ai_result に保存する添削結果。
type ReviewResult struct {
	Summary string       `json:"summary"`
	Items   []ReviewItem `json:"items"`
	// UsedCompanyAnalysis・UsedSelfAnalysis は、添削のときにAIへ企業分析・自己分析の分析結果を渡したか。
	// 「企業との一致」が情報不足になった理由を画面で示すために残す
	UsedCompanyAnalysis bool `json:"usedCompanyAnalysis"`
	UsedSelfAnalysis    bool `json:"usedSelfAnalysis"`
}

// reviewContext は、ES以外にAI添削へ渡す保存済みの分析結果。無ければ nil。
type reviewContext struct {
	companyAnalysis *string
	selfAnalysis    *string
}

// Review は、保存済みの添削結果1回分。
type Review struct {
	db.EsReview
	Result ReviewResult
}

// OverallScore は、全項目・全観点の点数の平均を小数第1位で丸めたもの。点数が1つも無ければ nil。
func (r ReviewResult) OverallScore() *float64 {
	sum, n := 0, 0
	for _, item := range r.Items {
		for _, s := range []Score{item.Structure, item.Specificity, item.CompanyFit} {
			if s.Value != nil {
				sum += *s.Value
				n++
			}
		}
	}
	if n == 0 {
		return nil
	}
	avg := math.Round(float64(sum)/float64(n)*10) / 10
	return &avg
}

// aiReview は、AIに返させるJSONの形。項目は入力と同じ順番で返させ、設問・回答はバックエンドが持つものを使う。
type aiReview struct {
	Summary string `json:"summary"`
	Items   []struct {
		Structure   Score  `json:"structure"`
		Specificity Score  `json:"specificity"`
		CompanyFit  Score  `json:"companyFit"`
		Improvement string `json:"improvement"`
		Rewrite     string `json:"rewrite"`
	} `json:"items"`
}

// Review は、保存済みのESの内容をAIに添削させ、添削結果を履歴に1件足す。何度でも実行できる。
// AIへの入力は画面から受け取らず、保存済みのデータから組み立てる（docs/backend-design.md 5章）。
func (s *Service) Review(ctx context.Context, userID, id uuid.UUID) (Review, error) {
	q := db.New(s.pool)
	entry, err := get(ctx, q, userID, id)
	if err != nil {
		return Review{}, err
	}
	items := reviewItems(entry)
	if len(items) == 0 {
		return Review{}, &platform.Error{Kind: platform.KindInvalid, Message: "添削する回答または本文を入力して保存してください"}
	}
	saved, err := q.GetEsReviewContext(ctx, db.GetEsReviewContextParams{CompanyID: entry.CompanyID, UserID: userID})
	if err != nil {
		return Review{}, fmt.Errorf("get es review context: %w", err)
	}
	rc := reviewContext{companyAnalysis: platform.EmptyToNil(saved.CompanyAnalysis), selfAnalysis: platform.EmptyToNil(saved.SelfAnalysis)}
	charge, err := s.limiter.HitAI(ctx, q, userID)
	if err != nil {
		return Review{}, err
	}
	var out aiReview
	usage, err := s.ai.GenerateJSON(ctx, ai.KindESReview, reviewInput(entry, items, rc), &out)
	if err != nil {
		charge.Refund(ctx, q)
		return Review{}, err
	}
	result, err := mergeReview(items, out)
	if err != nil {
		charge.Refund(ctx, q)
		return Review{}, ai.InvalidResult(ctx, err)
	}
	result.UsedCompanyAnalysis = rc.companyAnalysis != nil
	result.UsedSelfAnalysis = rc.selfAnalysis != nil
	encoded, err := json.Marshal(result)
	if err != nil {
		return Review{}, fmt.Errorf("encode es review: %w", err)
	}
	input, output := usage.ColumnValues()
	row, err := q.CreateEsReview(ctx, db.CreateEsReviewParams{UserID: userID, EsEntryID: id, AiResult: encoded, AiInputTokens: input, AiOutputTokens: output})
	if err != nil {
		return Review{}, fmt.Errorf("save es review: %w", err)
	}
	return Review{EsReview: row, Result: result}, nil
}

// reviewHistoryLimit は、添削の履歴として返す件数。画面は点数の推移を見せるだけなので、古い添削結果まで返さない。
// 古い履歴を消さないのは、AI添削の回数制限で1日の件数が限られ、DBの容量を圧迫しないため。
const reviewHistoryLimit = 10

// ListReviews は、ESの添削結果を新しい順に reviewHistoryLimit 件まで返す。他人のESなら、存在しないESと同じく 404 にする。
func (s *Service) ListReviews(ctx context.Context, userID, id uuid.UUID) ([]Review, error) {
	q := db.New(s.pool)
	if _, err := get(ctx, q, userID, id); err != nil {
		return nil, err
	}
	rows, err := q.ListEsReviews(ctx, db.ListEsReviewsParams{EsEntryID: id, UserID: userID, MaxRows: reviewHistoryLimit})
	if err != nil {
		return nil, fmt.Errorf("list es reviews: %w", err)
	}
	reviews := make([]Review, len(rows))
	for i, row := range rows {
		reviews[i] = Review{EsReview: row}
		if err := json.Unmarshal(row.AiResult, &reviews[i].Result); err != nil {
			return nil, fmt.Errorf("decode es review %s: %w", row.ID, err)
		}
	}
	return reviews, nil
}

// reviewItems は、添削する項目（回答のある設問と本文）を並べる。
func reviewItems(e Entry) []ReviewItem {
	var items []ReviewItem
	for _, q := range e.Questions {
		if strings.TrimSpace(q.Answer) == "" {
			continue
		}
		items = append(items, ReviewItem{Source: "question", Prompt: &q.Prompt, Answer: q.Answer, CharLimit: q.CharLimit})
	}
	if e.ContentMd != nil && strings.TrimSpace(*e.ContentMd) != "" {
		items = append(items, ReviewItem{Source: "body", Answer: *e.ContentMd})
	}
	return items
}

// reviewInput は、AI添削に渡す文章を作る。企業分析・自己分析の分析結果があれば、ESの前に付ける。
func reviewInput(e Entry, items []ReviewItem, rc reviewContext) string {
	header := []string{"企業: " + e.CompanyName}
	if e.Title != nil {
		header = append(header, "タイトル: "+*e.Title)
	}
	if e.Position != nil {
		header = append(header, "職種・募集枠: "+*e.Position)
	}
	if rc.companyAnalysis != nil {
		header = append(header, "", "企業分析の結果:\n"+*rc.companyAnalysis)
	}
	if rc.selfAnalysis != nil {
		header = append(header, "", "自己分析の結果:\n"+*rc.selfAnalysis)
	}
	body := make([]string, len(items))
	for i, item := range items {
		lines := []string{fmt.Sprintf("項目%d（本文）", i+1)}
		if item.Source == "question" {
			lines = []string{fmt.Sprintf("項目%d（設問）: %s", i+1, *item.Prompt)}
		}
		if item.CharLimit != nil {
			// 上限の9割以上を埋めるのがESの目安なので、修正版はその範囲に収めさせる
			lines = append(lines, fmt.Sprintf("文字数: %d〜%d字", int(math.Ceil(float64(*item.CharLimit)*0.9)), *item.CharLimit))
		}
		lines = append(lines, "回答:\n"+item.Answer)
		body[i] = strings.Join(lines, "\n")
	}
	return strings.Join(header, "\n") + "\n\n" + strings.Join(body, "\n\n")
}

// mergeReview は、AIの結果を項目に重ねる。件数や点数の範囲が合わなければエラーにする（壊れた結果を保存しない）。
func mergeReview(items []ReviewItem, out aiReview) (ReviewResult, error) {
	if len(out.Items) != len(items) {
		return ReviewResult{}, fmt.Errorf("ai returned %d review items, want %d", len(out.Items), len(items))
	}
	merged := make([]ReviewItem, len(items))
	for i, item := range items {
		got := out.Items[i]
		for _, s := range []Score{got.Structure, got.Specificity, got.CompanyFit} {
			if s.Value != nil && (*s.Value < 1 || *s.Value > 10) {
				return ReviewResult{}, fmt.Errorf("ai returned score %d for item %d, want 1-10", *s.Value, i+1)
			}
		}
		item.Structure, item.Specificity, item.CompanyFit = got.Structure, got.Specificity, got.CompanyFit
		item.Improvement, item.Rewrite = got.Improvement, got.Rewrite
		merged[i] = item
	}
	return ReviewResult{Summary: out.Summary, Items: merged}, nil
}
