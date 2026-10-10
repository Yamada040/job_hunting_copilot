package ai

import (
	"context"
	"fmt"
	"net/http"
	"strings"
)

type tavily struct {
	client   *http.Client
	endpoint string
	apiKey   string
}

func newTavily(cfg Config, client *http.Client) *tavily {
	endpoint := cfg.TavilyEndpoint
	if endpoint == "" {
		endpoint = "https://api.tavily.com/search"
	}
	return &tavily{client: client, endpoint: endpoint, apiKey: cfg.TavilyAPIKey}
}

// search は、Webを検索する。キーが無いときは結果0件として扱い、AIには「検索結果が見つからない」として伝える。
func (t *tavily) search(ctx context.Context, query string) ([]SearchResult, error) {
	if t.apiKey == "" {
		return nil, nil
	}
	var res struct {
		Results []struct {
			Title   string `json:"title"`
			URL     string `json:"url"`
			Content string `json:"content"`
		} `json:"results"`
	}
	body := map[string]any{"query": query, "search_depth": "basic", "max_results": 5, "include_answer": false}
	if err := postJSON(ctx, t.client, t.endpoint, map[string]string{"Authorization": "Bearer " + t.apiKey}, body, &res); err != nil {
		return nil, fmt.Errorf("tavily: %w", err)
	}
	results := make([]SearchResult, len(res.Results))
	for i, r := range res.Results {
		results[i] = SearchResult{Title: r.Title, URL: r.URL, Content: r.Content}
	}
	return results, nil
}

func formatSearchResults(results []SearchResult) string {
	if len(results) == 0 {
		return "検索結果が見つかりませんでした。"
	}
	blocks := make([]string, len(results))
	for i, r := range results {
		blocks[i] = fmt.Sprintf("【%s】\n%s\nURL: %s", r.Title, r.Content, r.URL)
	}
	return strings.Join(blocks, "\n\n")
}
