package ai

import (
	"context"
	"fmt"
	"net/http"
	"strings"
)

type gemini struct {
	client   *http.Client
	endpoint string
	apiKey   string
}

func newGemini(cfg Config, client *http.Client) *gemini {
	base := cfg.GeminiBaseURL
	if base == "" {
		base = "https://generativelanguage.googleapis.com"
	}
	version := cfg.GeminiAPIVersion
	if version == "" {
		version = "v1beta"
	}
	model := cfg.Model
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &gemini{client: client, endpoint: fmt.Sprintf("%s/%s/models/%s:generateContent", base, version, model), apiKey: cfg.APIKey}
}

type geminiFunctionCall struct {
	Name string            `json:"name"`
	Args map[string]string `json:"args"`
}

type geminiPart struct {
	Text             string                  `json:"text,omitempty"`
	FunctionCall     *geminiFunctionCall     `json:"functionCall,omitempty"`
	FunctionResponse *geminiFunctionResponse `json:"functionResponse,omitempty"`
}

type geminiFunctionResponse struct {
	Name     string            `json:"name"`
	Response map[string]string `json:"response"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiRequest struct {
	SystemInstruction *geminiContent   `json:"system_instruction,omitempty"`
	Contents          []geminiContent  `json:"contents"`
	Tools             []map[string]any `json:"tools,omitempty"`
	GenerationConfig  map[string]any   `json:"generationConfig"`
}

type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
	UsageMetadata struct {
		PromptTokenCount     int `json:"promptTokenCount"`
		CandidatesTokenCount int `json:"candidatesTokenCount"`
		ThoughtsTokenCount   int `json:"thoughtsTokenCount"`
	} `json:"usageMetadata"`
}

func (g *gemini) call(ctx context.Context, req geminiRequest) ([]geminiPart, Usage, error) {
	if req.GenerationConfig == nil {
		req.GenerationConfig = map[string]any{}
	}
	req.GenerationConfig["temperature"] = 0.7
	var res geminiResponse
	if err := postJSON(ctx, g.client, g.endpoint, map[string]string{"x-goog-api-key": g.apiKey}, req, &res); err != nil {
		return nil, Usage{}, fmt.Errorf("gemini: %w", err)
	}
	m := res.UsageMetadata
	usage := Usage{InputTokens: m.PromptTokenCount, OutputTokens: m.CandidatesTokenCount + m.ThoughtsTokenCount}
	if len(res.Candidates) == 0 {
		return nil, usage, fmt.Errorf("gemini: %w", errEmptyResponse)
	}
	return res.Candidates[0].Content.Parts, usage, nil
}

func (g *gemini) generate(ctx context.Context, prompt string, asJSON bool) (string, Usage, error) {
	req := geminiRequest{Contents: []geminiContent{{Role: "user", Parts: []geminiPart{{Text: prompt}}}}}
	if asJSON {
		// responseSchema で形まで指定しないのは、GPT と同じくプロンプトで形を伝え、検証はバックエンドで1か所にまとめるため
		req.GenerationConfig = map[string]any{"responseMimeType": "application/json"}
	}
	parts, usage, err := g.call(ctx, req)
	if err != nil {
		return "", usage, err
	}
	text, err := joinText(parts)
	return text, usage, err
}

var geminiSearchTool = map[string]any{
	"functionDeclarations": []map[string]any{{
		"name":        "search_web",
		"description": "Webを検索して企業の最新情報（採用情報・ニュース・口コミ・社風など）を取得する",
		"parameters": map[string]any{
			"type":       "object",
			"properties": map[string]any{"query": map[string]any{"type": "string", "description": "検索クエリ（例: 'ソフトバンク 採用情報 2026'）"}},
			"required":   []string{"query"},
		},
	}},
}

func (g *gemini) generateWithSearch(ctx context.Context, instructions, input string, search searchFunc) (string, Usage, error) {
	system := &geminiContent{Parts: []geminiPart{{Text: instructions}}}
	contents := []geminiContent{{Role: "user", Parts: []geminiPart{{Text: input}}}}
	var total Usage

	for range maxSearches {
		parts, usage, err := g.call(ctx, geminiRequest{SystemInstruction: system, Contents: contents, Tools: []map[string]any{geminiSearchTool}})
		total = total.add(usage)
		if err != nil {
			return "", total, err
		}
		call := firstFunctionCall(parts)
		if call == nil {
			text, err := joinText(parts)
			return text, total, err
		}
		result := search(ctx, call.Args["query"])
		contents = append(contents,
			geminiContent{Role: "model", Parts: []geminiPart{{FunctionCall: call}}},
			geminiContent{Role: "user", Parts: []geminiPart{{FunctionResponse: &geminiFunctionResponse{
				Name: "search_web", Response: map[string]string{"result": result},
			}}}},
		)
	}
	// 検索の上限に達したら、ツールを渡さずに、ここまでの検索結果で回答させる
	parts, usage, err := g.call(ctx, geminiRequest{SystemInstruction: system, Contents: contents})
	total = total.add(usage)
	if err != nil {
		return "", total, err
	}
	text, err := joinText(parts)
	return text, total, err
}

func firstFunctionCall(parts []geminiPart) *geminiFunctionCall {
	for _, p := range parts {
		if p.FunctionCall != nil {
			return p.FunctionCall
		}
	}
	return nil
}

func joinText(parts []geminiPart) (string, error) {
	var texts []string
	for _, p := range parts {
		if p.Text != "" {
			texts = append(texts, p.Text)
		}
	}
	if len(texts) == 0 {
		return "", fmt.Errorf("gemini: %w", errEmptyResponse)
	}
	return strings.Join(texts, "\n"), nil
}
