import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { components } from "./schema";

export type Me = components["schemas"]["Me"];
export type ProfileUpdate = components["schemas"]["ProfileUpdate"];

export const meQueryKey = ["me"] as const;

/** ログイン中のユーザーのプロフィール・XP・レベル。ヘッダーやサイドバーなど複数の場所で、1回の取得を共有する。 */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => unwrap(api.GET("/v1/me")),
  });
}

/** プロフィールを更新し、返ってきた最新の値でキャッシュを置き換える（取り直しの通信を省く）。 */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpdate) => unwrap(api.PATCH("/v1/me", { body })),
    onSuccess: (me) => queryClient.setQueryData(meQueryKey, me),
  });
}
