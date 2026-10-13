// Package ai は、Gemini・GPT の呼び出しと、企業分析のためのWeb検索（Tavily）を受け持つ。
// AIの呼び出しは必ずこのパッケージを通す。
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

// 企業分析で、AIにWeb検索をさせる回数の上限。Tavily の無料枠を使い切らないため
const maxSearches = 3

// Config は、AIの設定。環境変数から読む（cmd/server）。
type Config struct {
	// Provider は "gemini" か "gpt"（"openai" は "gpt" の別名）
	Provider string
	APIKey   string
	// Model が空なら、プロバイダーごとの既定のモデルを使う
	Model string
	// GPTEndpoint は、OpenAI 互換のエンドポイント。空なら OpenAI のものを使う
	GPTEndpoint string
	// GeminiBaseURL と GeminiAPIVersion は、空ならGoogleの既定値を使う（テストでは偽のサーバーを指す）
	GeminiBaseURL    string
	GeminiAPIVersion string
	TavilyAPIKey     string
	TavilyEndpoint   string
}

// SearchResult は、Web検索の1件。
type SearchResult struct {
	Title   string
	URL     string
	Content string
}

// Usage は、AIの呼び出しで使ったトークン数。企業分析のように複数回呼ぶときは合計する。
// Gemini の思考（thinking）のトークンは料金上は出力として数えられるので、OutputTokens に含める。
type Usage struct {
	InputTokens  int
	OutputTokens int
}

// ColumnValues は、DBの ai_input_tokens・ai_output_tokens 列に入れる値を返す。
func (u Usage) ColumnValues() (input, output *int32) {
	in, out := int32(u.InputTokens), int32(u.OutputTokens)
	return &in, &out
}

func (u Usage) add(other Usage) Usage {
	return Usage{InputTokens: u.InputTokens + other.InputTokens, OutputTokens: u.OutputTokens + other.OutputTokens}
}

// searchFunc は、企業分析でAIが使うWeb検索。
type searchFunc func(ctx context.Context, query string) ([]SearchResult, error)

// provider は、AIのプロバイダーごとの違いを隠す。
type provider interface {
	// asJSON が true なら、AIにJSONだけを返させる
	generate(ctx context.Context, prompt string, asJSON bool) (string, Usage, error)
	// generateWithSearch は、AIが必要に応じて search を呼びながら回答を作る（企業分析で使う）
	generateWithSearch(ctx context.Context, instructions, input string, search searchFunc) (string, Usage, error)
}

type Client struct {
	provider provider
	search   searchFunc
}

func NewClient(cfg Config, httpClient *http.Client) *Client {
	if cfg.APIKey == "" {
		return &Client{}
	}
	var p provider
	switch cfg.Provider {
	case "gpt", "openai":
		p = newGPT(cfg, httpClient)
	default:
		p = newGemini(cfg, httpClient)
	}
	return &Client{provider: p, search: newTavily(cfg, httpClient).search}
}

// Generate は、kind の指示で input を処理した結果の文章と、使ったトークン数を返す。
func (c *Client) Generate(ctx context.Context, kind Kind, input string) (string, Usage, error) {
	if c.provider == nil {
		return "", Usage{}, notConfigured()
	}
	text, usage, err := c.provider.generate(ctx, buildPrompt(kind, input), false)
	return text, usage, upstream(ctx, err)
}

// GenerateJSON は、kind の指示で input を処理させ、AIが返したJSONを out に読み込む。
// 中身が求めた形かどうか（件数・値の範囲）は呼び出し側が確かめ、合わなければ InvalidResult を返す。
func (c *Client) GenerateJSON(ctx context.Context, kind Kind, input string, out any) (Usage, error) {
	if c.provider == nil {
		return Usage{}, notConfigured()
	}
	text, usage, err := c.provider.generate(ctx, buildPrompt(kind, input), true)
	if err != nil {
		return Usage{}, upstream(ctx, err)
	}
	if err := json.Unmarshal([]byte(text), out); err != nil {
		return Usage{}, InvalidResult(ctx, fmt.Errorf("decode ai json: %w", err))
	}
	return usage, nil
}

// AnalyzeCompany は、AIにWeb検索をさせながら企業を分析した結果と、検索をはさんだ全呼び出しの合計のトークン数を返す。
func (c *Client) AnalyzeCompany(ctx context.Context, input string) (string, Usage, error) {
	if c.provider == nil {
		return "", Usage{}, notConfigured()
	}
	text, usage, err := c.provider.generateWithSearch(ctx, instructionsFor(KindCompanyAnalysis), prompts[KindCompanyAnalysis].inputLabel+"\n"+input, c.search)
	return text, usage, upstream(ctx, err)
}

// キーが無いときに仮の文章を返さないのは、結果を保存する機能（1回しか実行できない適性診断など）で、仮の文章が保存されてしまうため
func notConfigured() error {
	return &platform.Error{Kind: platform.KindUnavailable, Message: "AIの設定が完了していないため、現在AI機能は使えません。"}
}

var errEmptyResponse = errors.New("ai returned no text")

// InvalidResult は、AIの結果が求めた形になっていなかったときのエラー。利用者には、AIの呼び出しに失敗したときと同じく再試行を促す。
func InvalidResult(ctx context.Context, err error) error {
	return upstream(ctx, err)
}

func upstream(ctx context.Context, err error) error {
	if err == nil {
		return nil
	}
	platform.Logger(ctx).Error("ai request failed", "error", err)
	return &platform.Error{Kind: platform.KindUnavailable, Message: "AIの処理に失敗しました。しばらく経ってから再試行してください。"}
}

// postJSON は、body をJSONで送り、レスポンスのJSONを out に読み込む。
func postJSON(ctx context.Context, client *http.Client, url string, headers map[string]string, body, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("encode request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	start := time.Now()
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer func() { _ = res.Body.Close() }()
	slog.DebugContext(ctx, "ai http request", "status", res.StatusCode, "duration_ms", time.Since(start).Milliseconds())
	if res.StatusCode >= 300 {
		detail, _ := io.ReadAll(io.LimitReader(res.Body, 2000))
		return fmt.Errorf("status %d: %s", res.StatusCode, detail)
	}
	if err := json.NewDecoder(res.Body).Decode(out); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	return nil
}

// Generator は、AIを使う機能が必要とする操作。テストでは偽物に差し替える。
type Generator interface {
	Generate(ctx context.Context, kind Kind, input string) (string, Usage, error)
	GenerateJSON(ctx context.Context, kind Kind, input string, out any) (Usage, error)
	AnalyzeCompany(ctx context.Context, input string) (string, Usage, error)
}

var _ Generator = (*Client)(nil)
