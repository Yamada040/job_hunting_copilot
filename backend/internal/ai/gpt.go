package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type gpt struct {
	client   *http.Client
	endpoint string
	apiKey   string
	model    string
}

func newGPT(cfg Config, client *http.Client) *gpt {
	endpoint := cfg.GPTEndpoint
	if endpoint == "" {
		endpoint = "https://api.openai.com/v1/chat/completions"
	}
	model := cfg.Model
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &gpt{client: client, endpoint: endpoint, apiKey: cfg.APIKey, model: model}
}

type gptToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type gptMessage struct {
	Role       string        `json:"role"`
	Content    string        `json:"content,omitempty"`
	ToolCalls  []gptToolCall `json:"tool_calls,omitempty"`
	ToolCallID string        `json:"tool_call_id,omitempty"`
}

type gptRequest struct {
	Model       string           `json:"model"`
	Messages    []gptMessage     `json:"messages"`
	Tools       []map[string]any `json:"tools,omitempty"`
	Temperature float64          `json:"temperature"`
	// ResponseFormat は、JSONだけを返させるときに {"type": "json_object"} を入れる
	ResponseFormat map[string]string `json:"response_format,omitempty"`
}

type gptResponse struct {
	Choices []struct {
		Message gptMessage `json:"message"`
	} `json:"choices"`
	// completion_tokens は、推論（reasoning）のトークンも含む
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

func (g *gpt) call(ctx context.Context, req gptRequest) (gptMessage, Usage, error) {
	var res gptResponse
	req.Model = g.model
	req.Temperature = 0.7
	if err := postJSON(ctx, g.client, g.endpoint, map[string]string{"Authorization": "Bearer " + g.apiKey}, req, &res); err != nil {
		return gptMessage{}, Usage{}, fmt.Errorf("gpt: %w", err)
	}
	usage := Usage{InputTokens: res.Usage.PromptTokens, OutputTokens: res.Usage.CompletionTokens}
	if len(res.Choices) == 0 {
		return gptMessage{}, usage, fmt.Errorf("gpt: %w", errEmptyResponse)
	}
	return res.Choices[0].Message, usage, nil
}

func (g *gpt) generate(ctx context.Context, prompt string, asJSON bool) (string, Usage, error) {
	req := gptRequest{Messages: []gptMessage{
		{Role: "system", Content: "You are an assistant for Japanese job hunting. Reply in Japanese."},
		{Role: "user", Content: prompt},
	}}
	if asJSON {
		req.ResponseFormat = map[string]string{"type": "json_object"}
	}
	msg, usage, err := g.call(ctx, req)
	if err != nil {
		return "", usage, err
	}
	if msg.Content == "" {
		return "", usage, fmt.Errorf("gpt: %w", errEmptyResponse)
	}
	return msg.Content, usage, nil
}

var gptSearchTool = map[string]any{
	"type": "function",
	"function": map[string]any{
		"name":        "search_web",
		"description": "Webを検索して企業の最新情報（採用情報・ニュース・口コミ・社風など）を取得する",
		"parameters": map[string]any{
			"type":       "object",
			"properties": map[string]any{"query": map[string]any{"type": "string"}},
			"required":   []string{"query"},
		},
	},
}

// generateWithSearch は、1回の応答に複数の検索の依頼が来ることがあるため、往復の回数ではなく実際に検索した回数で maxSearches を数える。
func (g *gpt) generateWithSearch(ctx context.Context, instructions, input string, search searchFunc) (string, Usage, error) {
	messages := []gptMessage{{Role: "system", Content: instructions}, {Role: "user", Content: input}}
	var total Usage
	searches := 0

	for {
		req := gptRequest{Messages: messages}
		// 検索の上限に達したら、ツールを渡さずに、ここまでの検索結果で回答させる
		if searches < maxSearches {
			req.Tools = []map[string]any{gptSearchTool}
		}
		msg, usage, err := g.call(ctx, req)
		total = total.add(usage)
		if err != nil {
			return "", total, err
		}
		if len(msg.ToolCalls) == 0 || req.Tools == nil {
			if msg.Content == "" {
				return "", total, fmt.Errorf("gpt: %w", errEmptyResponse)
			}
			return msg.Content, total, nil
		}
		messages = append(messages, msg)
		// OpenAI は、依頼されたすべての tool_call に返事が無いとエラーにするので、上限を超えた分にも返事をする
		for _, call := range msg.ToolCalls {
			reply := searchLimitReply
			if searches < maxSearches {
				var args struct {
					Query string `json:"query"`
				}
				if err := json.Unmarshal([]byte(call.Function.Arguments), &args); err != nil {
					return "", total, fmt.Errorf("gpt: decode tool arguments: %w", err)
				}
				reply = search(ctx, args.Query)
				searches++
			}
			messages = append(messages, gptMessage{Role: "tool", ToolCallID: call.ID, Content: reply})
		}
	}
}

const searchLimitReply = "検索の回数の上限に達したため、この検索は行いませんでした。ここまでの検索結果で回答してください。"
