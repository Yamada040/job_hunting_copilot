package ai

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/platform"
)

func isUnavailable(err error) bool {
	var appErr *platform.Error
	return errors.As(err, &appErr) && appErr.Kind == platform.KindUnavailable
}

// fakeServer は、受け取ったリクエストの本文を記録し、responses を順に返す。
func fakeServer(t *testing.T, responses ...string) (*httptest.Server, *[]string) {
	t.Helper()
	var bodies []string
	var n atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		bodies = append(bodies, r.Header.Get("x-goog-api-key")+r.Header.Get("Authorization")+"|"+string(b))
		i := int(n.Add(1)) - 1
		if i >= len(responses) {
			http.Error(w, "unexpected request", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(responses[i]))
	}))
	t.Cleanup(srv.Close)
	return srv, &bodies
}

func TestGenerateWithoutKeyIsUnavailable(t *testing.T) {
	_, _, err := NewClient(Config{}, http.DefaultClient).Generate(t.Context(), KindESReview, "ES")

	if !isUnavailable(err) {
		t.Errorf("error = %v, want unavailable", err)
	}
}

func TestGeminiGenerateSendsPromptAndReturnsTextAndUsage(t *testing.T) {
	srv, bodies := fakeServer(t, `{"candidates":[{"content":{"parts":[{"text":"添削結果"}]}}],
		"usageMetadata":{"promptTokenCount":100,"candidatesTokenCount":40,"thoughtsTokenCount":60}}`)
	c := NewClient(Config{Provider: "gemini", APIKey: "key-1", GeminiBaseURL: srv.URL}, srv.Client())

	text, usage, err := c.Generate(t.Context(), KindESReview, "志望動機の回答")
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}

	if text != "添削結果" {
		t.Errorf("text = %q, want 添削結果", text)
	}
	if usage != (Usage{InputTokens: 100, OutputTokens: 100}) {
		t.Errorf("usage = %+v, want the thinking tokens counted as output", usage)
	}
	if !strings.HasPrefix((*bodies)[0], "key-1|") || !strings.Contains((*bodies)[0], "志望動機の回答") {
		t.Errorf("request = %s, want the API key header and the input in the prompt", (*bodies)[0])
	}
}

func TestGeminiAnalyzeCompanySearchesThenAnswers(t *testing.T) {
	gem, gemBodies := fakeServer(t,
		`{"candidates":[{"content":{"parts":[{"functionCall":{"name":"search_web","args":{"query":"サンプル 採用"}}}]}}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":1}}`,
		`{"candidates":[{"content":{"parts":[{"text":"分析結果"}]}}],"usageMetadata":{"promptTokenCount":200,"candidatesTokenCount":50}}`,
	)
	tav, tavBodies := fakeServer(t, `{"results":[{"title":"採用ページ","url":"https://example.com","content":"新卒採用"}]}`)
	c := NewClient(Config{Provider: "gemini", APIKey: "k", GeminiBaseURL: gem.URL, TavilyAPIKey: "t", TavilyEndpoint: tav.URL}, gem.Client())

	text, usage, err := c.AnalyzeCompany(t.Context(), "企業名: サンプル")
	if err != nil {
		t.Fatalf("AnalyzeCompany: %v", err)
	}

	if text != "分析結果" {
		t.Errorf("text = %q, want 分析結果", text)
	}
	if usage != (Usage{InputTokens: 210, OutputTokens: 51}) {
		t.Errorf("usage = %+v, want the sum of both calls", usage)
	}
	if len(*tavBodies) != 1 || !strings.Contains((*tavBodies)[0], "サンプル 採用") {
		t.Errorf("tavily requests = %v, want one search with the query from the model", *tavBodies)
	}
	if !strings.Contains((*gemBodies)[1], "新卒採用") {
		t.Errorf("second gemini request = %s, want the search result passed back", (*gemBodies)[1])
	}
}

func TestGPTGenerateReturnsText(t *testing.T) {
	srv, bodies := fakeServer(t, `{"choices":[{"message":{"role":"assistant","content":"振り返り結果"}}],"usage":{"prompt_tokens":30,"completion_tokens":20}}`)
	c := NewClient(Config{Provider: "gpt", APIKey: "key-2", GPTEndpoint: srv.URL}, srv.Client())

	text, usage, err := c.Generate(t.Context(), KindInterviewReview, "面接の内容")
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}

	var req gptRequest
	if err := json.Unmarshal([]byte(strings.SplitN((*bodies)[0], "|", 2)[1]), &req); err != nil {
		t.Fatalf("decode request: %v", err)
	}
	if text != "振り返り結果" || req.Model != "gpt-4o-mini" || !strings.Contains(req.Messages[1].Content, "面接の内容") {
		t.Errorf("text = %q, request = %+v; want the default model and the input in the prompt", text, req)
	}
	if usage != (Usage{InputTokens: 30, OutputTokens: 20}) {
		t.Errorf("usage = %+v, want the usage from the response", usage)
	}
}

func TestGPTAnalyzeCompanyAnswersToolCalls(t *testing.T) {
	gpt, gptBodies := fakeServer(t,
		`{"choices":[{"message":{"role":"assistant","tool_calls":[{"id":"call-1","type":"function","function":{"name":"search_web","arguments":"{\"query\":\"サンプル\"}"}}]}}]}`,
		`{"choices":[{"message":{"role":"assistant","content":"分析結果"}}]}`,
	)
	c := NewClient(Config{Provider: "gpt", APIKey: "k", GPTEndpoint: gpt.URL}, gpt.Client())

	text, _, err := c.AnalyzeCompany(t.Context(), "企業名: サンプル")
	if err != nil {
		t.Fatalf("AnalyzeCompany: %v", err)
	}

	if text != "分析結果" || !strings.Contains((*gptBodies)[1], `"tool_call_id":"call-1"`) {
		t.Errorf("text = %q, second request = %s; want the tool result answered to call-1", text, (*gptBodies)[1])
	}
}

func TestUpstreamErrorIsUnavailable(t *testing.T) {
	srv, _ := fakeServer(t) // 何も返さず500
	c := NewClient(Config{Provider: "gemini", APIKey: "k", GeminiBaseURL: srv.URL}, srv.Client())

	_, _, err := c.Generate(t.Context(), KindSelfAnalysis, "回答")

	if !isUnavailable(err) {
		t.Errorf("error = %v, want unavailable", err)
	}
}

func TestGeminiGenerateJSONAsksForJSONAndDecodes(t *testing.T) {
	srv, bodies := fakeServer(t, `{"candidates":[{"content":{"parts":[{"text":"{\"summary\":\"講評\"}"}]}}]}`)
	c := NewClient(Config{Provider: "gemini", APIKey: "k", GeminiBaseURL: srv.URL}, srv.Client())

	var out struct{ Summary string }
	if _, err := c.GenerateJSON(t.Context(), KindESReview, "ES", &out); err != nil {
		t.Fatalf("GenerateJSON: %v", err)
	}

	if out.Summary != "講評" || !strings.Contains((*bodies)[0], `"responseMimeType":"application/json"`) {
		t.Errorf("out = %+v, request = %s; want JSON mode and the decoded reply", out, (*bodies)[0])
	}
}

func TestGPTGenerateJSONAsksForJSONObject(t *testing.T) {
	srv, bodies := fakeServer(t, `{"choices":[{"message":{"role":"assistant","content":"{\"summary\":\"講評\"}"}}]}`)
	c := NewClient(Config{Provider: "gpt", APIKey: "k", GPTEndpoint: srv.URL}, srv.Client())

	var out struct{ Summary string }
	if _, err := c.GenerateJSON(t.Context(), KindESReview, "ES", &out); err != nil {
		t.Fatalf("GenerateJSON: %v", err)
	}

	if out.Summary != "講評" || !strings.Contains((*bodies)[0], `"response_format":{"type":"json_object"}`) {
		t.Errorf("out = %+v, request = %s; want JSON mode and the decoded reply", out, (*bodies)[0])
	}
}

func TestGenerateJSONWithBrokenReplyIsUnavailable(t *testing.T) {
	srv, _ := fakeServer(t, `{"candidates":[{"content":{"parts":[{"text":"JSONではない文章"}]}}]}`)
	c := NewClient(Config{Provider: "gemini", APIKey: "k", GeminiBaseURL: srv.URL}, srv.Client())

	var out struct{ Summary string }
	if _, err := c.GenerateJSON(t.Context(), KindESReview, "ES", &out); !isUnavailable(err) {
		t.Errorf("error = %v, want unavailable", err)
	}
}
