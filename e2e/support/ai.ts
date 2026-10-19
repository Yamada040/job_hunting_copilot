// 偽のAIサーバー（e2e/fake-ai/server.mjs）は、プロンプトにこの文字列があると失敗を返す。
// AIが失敗したときの画面を確かめるテストが、企業名などに入れて使う
export const AI_FAILURE_MARKER = "AI失敗";
