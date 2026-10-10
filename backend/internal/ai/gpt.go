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
}

type gptResponse struct {
	Choices []struct {
		Message gptMessage `json:"message"`
	} `json:"choices"`
}

func (g *gpt) call(ctx context.Context, messages []gptMessage, tools []map[string]any) (gptMessage, error) {
	var res gptResponse
	req := gptRequest{Model: g.model, Messages: messages, Tools: tools, Temperature: 0.7}
	if err := postJSON(ctx, g.client, g.endpoint, map[string]string{"Authorization": "Bearer " + g.apiKey}, req, &res); err != nil {
		return gptMessage{}, fmt.Errorf("gpt: %w", err)
	}
	if len(res.Choices) == 0 {
		return gptMessage{}, fmt.Errorf("gpt: %w", errEmptyResponse)
	}
	return res.Choices[0].Message, nil
}

func (g *gpt) generate(ctx context.Context, prompt string) (string, error) {
	msg, err := g.call(ctx, []gptMessage{
		{Role: "system", Content: "You are an assistant for Japanese job hunting. Reply in Japanese."},
		{Role: "user", Content: prompt},
	}, nil)
	if err != nil {
		return "", err
	}
	if msg.Content == "" {
		return "", fmt.Errorf("gpt: %w", errEmptyResponse)
	}
	return msg.Content, nil
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

func (g *gpt) generateWithSearch(ctx context.Context, instructions, input string, search searchFunc) (string, error) {
	messages := []gptMessage{{Role: "system", Content: instructions}, {Role: "user", Content: input}}

	for range maxSearches {
		msg, err := g.call(ctx, messages, []map[string]any{gptSearchTool})
		if err != nil {
			return "", err
		}
		if len(msg.ToolCalls) == 0 {
			if msg.Content == "" {
				return "", fmt.Errorf("gpt: %w", errEmptyResponse)
			}
			return msg.Content, nil
		}
		messages = append(messages, msg)
		for _, call := range msg.ToolCalls {
			var args struct {
				Query string `json:"query"`
			}
			if err := json.Unmarshal([]byte(call.Function.Arguments), &args); err != nil {
				return "", fmt.Errorf("gpt: decode tool arguments: %w", err)
			}
			results, err := search(ctx, args.Query)
			if err != nil {
				return "", err
			}
			messages = append(messages, gptMessage{Role: "tool", ToolCallID: call.ID, Content: formatSearchResults(results)})
		}
	}
	// 検索の上限に達したら、ツールを渡さずに、ここまでの検索結果で回答させる
	msg, err := g.call(ctx, messages, nil)
	if err != nil {
		return "", err
	}
	if msg.Content == "" {
		return "", fmt.Errorf("gpt: %w", errEmptyResponse)
	}
	return msg.Content, nil
}
