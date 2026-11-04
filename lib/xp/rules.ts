/**
 * XPのもらい方の説明に出す、操作ごとのXPと制限。付与はバックエンド（backend/internal/xp の rules）が決めるので、
 * 値を変えるときは両方をそろえる。
 */
// API で配らないのは、画面の説明のためだけに通信を1回増やすほどの値ではなく、変わることもまれなため
export const XP_RULES = [
  { action: "ESを提出する", xp: 25, limit: "同じESには1回、1日5回まで" },
  { action: "面接ログを追加する", xp: 20, limit: "同じログには1回、1日5回まで" },
  { action: "企業を登録する", xp: 5, limit: "1日5回まで" },
  { action: "適性チェックに回答する", xp: 15, limit: "初回だけ" },
  { action: "自己分析に回答する", xp: 15, limit: "初回だけ" },
  { action: "Webテストの問題を追加する", xp: 5, limit: "1日3回まで" },
  { action: "Webテストの問題を解く", xp: 15, limit: "1日2回まで" },
] as const;
