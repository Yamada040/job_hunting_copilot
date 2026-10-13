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

/** XPの獲得履歴（新しい順）。 */
export function useXpLogs(limit = 100) {
  return useQuery({
    queryKey: ["xp-logs", limit],
    queryFn: () => unwrap(api.GET("/v1/xp-logs", { params: { query: { limit } } })),
  });
}
