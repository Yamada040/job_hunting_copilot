// E2E でバックエンドが呼ぶ、偽の OpenAI 互換サーバー。playwright.config.ts が起動し、バックエンドの AI_ENDPOINT をここに向ける。
// バックエンドに E2E 専用の切り替えを足さず、本番と同じ GPT の呼び出し・応答の読み取り・保存の流れを通すため、HTTP の手前で差し替える。
// 機能はプロンプトの指示の文言で見分ける（backend/internal/ai/prompts.go）。プロンプトを変えたら、ここも合わせる。
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 8190);

// プロンプトにこの文字列があれば失敗を返す。AIが失敗したときの画面を確かめるテストが、企業名などに入れて使う（e2e/support/ai.ts）
const FAILURE_MARKER = "AI失敗";

const replies = [
  { match: "ESの項目（設問または本文）を1つずつ添削します", reply: esReview },
  { match: "面接の振り返り内容から改善点を抽出し", reply: () => "E2Eの振り返り結果：結論から話せていました。" },
  { match: "候補者向けに会社を説明し", reply: () => "E2Eの分析結果：求める人物像は、自分で考えて動ける人です。" },
  { match: "向いている/避けたほうがよい業界・職種", reply: () => "E2Eの診断結果：向いている業界はIT・SaaSです。" },
  { match: "本人の強み・価値観・モチベーション源泉", reply: () => "E2Eの分析結果：強みは粘り強さです。" },
];

// ESの添削は JSON で、入力の項目と同じ数の items が無いとバックエンドが失敗にする（backend/internal/es/review.go）。
// 修正版には元の回答を入れ、バックエンドが保存済みのESからAIへの入力を組み立てたことを画面で確かめられるようにする
function esReview(prompt) {
  const answers = prompt
    .split(/\n\n(?=項目\d+（)/)
    .slice(1)
    .map((item) => item.split("回答:\n")[1] ?? "");
  return JSON.stringify({
    summary: "E2Eの添削結果：結論が先にあり、読みやすいESです。",
    items: answers.map((answer) => ({
      structure: { score: 8, comment: "結論が先にあります" },
      specificity: { score: 6, comment: "数字があるとより伝わります" },
      companyFit: { score: null, comment: "情報不足：企業分析の結果がありません" },
      improvement: "取り組みの結果を数字で書くと良いです。",
      rewrite: `修正版：${answer}`,
    })),
  });
}

function respond(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") return respond(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/v1/chat/completions") return respond(res, 404, { error: "not found" });

  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const { messages } = JSON.parse(raw);
    const prompt = messages.map((m) => m.content ?? "").join("\n");
    if (prompt.includes(FAILURE_MARKER)) return respond(res, 500, { error: { message: "e2e failure" } });

    const found = replies.find((r) => prompt.includes(r.match));
    if (!found) return respond(res, 400, { error: { message: "unknown prompt" } });
    // 企業分析では検索のツールが渡されるが、検索を頼まずに答える（E2E には Tavily のキーが無く、検索は使えない）
    respond(res, 200, {
      choices: [{ message: { role: "assistant", content: found.reply(prompt) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });
  });
});

server.listen(port, "127.0.0.1");
