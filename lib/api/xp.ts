import { useQuery, type QueryClient } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import { meQueryKey, type Me } from "./me";
import type { components } from "./schema";

export type XpResult = components["schemas"]["XpResult"];

/**
 * XPが付く操作のレスポンスに含まれる付与結果で、ヘッダーが読む useMe のキャッシュを書き換える。
 * プロフィールを取り直す通信をせずに、XP・レベルの表示とレベルアップの演出が更新される。
 */
export function applyXpResult(queryClient: QueryClient, xp: XpResult) {
  queryClient.setQueryData<Me>(meQueryKey, (me) => (me ? { ...me, xp: xp.total, level: xp.level } : me));
  void queryClient.invalidateQueries({ queryKey: ["xp-logs"] });
}

export type XpLog = components["schemas"]["XpLog"];
export type XpAction = components["schemas"]["XpAction"];

/** XPの獲得履歴（新しい順）。 */
export function useXpLogs(limit = 100) {
  return useQuery({
    queryKey: ["xp-logs", limit],
    queryFn: () => unwrap(api.GET("/v1/xp-logs", { params: { query: { limit } } })),
  });
}

/** XPが付いた操作の表示名。 */
export const XP_ACTION_LABELS: Record<XpAction, string> = {
  es_submitted: "ESを提出",
  interview_log: "面接ログを記録",
  company_new: "企業を登録",
  aptitude_complete: "適性診断",
  self_analysis_complete: "自己分析",
  webtest_question_create: "Webテストの問題を作成",
  webtest_attempt_complete: "Webテストに解答",
};
