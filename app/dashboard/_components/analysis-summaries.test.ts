import { describe, expect, it } from "vitest";

import { analysisPreview, pageOf, pendingAnalyses, recentAnalyses } from "./analysis-summaries";

const companies = [
  { name: "A", aiResultPreview: null },
  { name: "B", aiResultPreview: "分析B" },
  { name: "C", aiResultPreview: null },
  { name: "D", aiResultPreview: "分析D" },
  { name: "E", aiResultPreview: null },
];

describe("pendingAnalyses", () => {
  it("分析していない企業だけを、一覧の順のまま返す", () => {
    expect(pendingAnalyses(companies).map((c) => c.name)).toEqual(["A", "C", "E"]);
  });
});

describe("recentAnalyses", () => {
  it("分析した企業だけを、一覧の順のまま返す", () => {
    expect(recentAnalyses(companies).map((c) => c.name)).toEqual(["B", "D"]);
  });
});

describe("analysisPreview", () => {
  it("見出しや箇条書きの記号と改行を除き、1続きの文にする", () => {
    expect(analysisPreview("## 概要\n**自動車**の大手。\n- 強み", 50)).toBe("概要 自動車の大手。 ・強み");
  });

  it("長い文は上限の文字数で切り、続きがあることを示す", () => {
    expect(analysisPreview("あいうえおかきくけこ", 5)).toBe("あいうえお…");
  });
});

describe("pageOf", () => {
  const items = ["A", "B", "C", "D", "E"];

  it("1ページに2件ずつ分け、ページの数を返す", () => {
    expect(pageOf(items, 1)).toEqual({ items: ["C", "D"], page: 1, pageCount: 3 });
    expect(pageOf(items, 2)).toEqual({ items: ["E"], page: 2, pageCount: 3 });
  });

  it("件数が減って今のページが無くなったら、最後のページを返す", () => {
    expect(pageOf(["A", "B"], 2)).toEqual({ items: ["A", "B"], page: 0, pageCount: 1 });
  });

  it("項目が無くても1ページとして扱う", () => {
    expect(pageOf([], 0)).toEqual({ items: [], page: 0, pageCount: 1 });
  });
});
