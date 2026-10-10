export const MAX_TEXT_LEN = 100;

export const ES_NEW_FIELDS = [
  { name: "company_name", label: "企業名" },
  { name: "title", label: "タイトル" },
  { name: "selection_status", label: "職種/募集枠" },
  { name: "company_url", label: "企業URL" },
  { name: "memo", label: "メモ" },
] as const;

export const WEBTEST_NEW_FIELDS = [
  { name: "title", label: "タイトル" },
  { name: "category", label: "カテゴリ" },
  { name: "test_type", label: "テスト形式" },
  { name: "format", label: "出題形式" },
  { name: "difficulty", label: "難易度" },
  { name: "answer", label: "正解" },
] as const;
