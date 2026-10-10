import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { calendarKeys } from "./calendar";
import { api, unwrap } from "./client";
import type { components } from "./schema";
import { applyXpResult } from "./xp";

export type EsEntry = components["schemas"]["EsEntry"];
export type EsQuestion = components["schemas"]["EsQuestion"];
export type EsEntryCreate = components["schemas"]["EsEntryCreate"];
export type EsEntryUpdate = components["schemas"]["EsEntryUpdate"];

export const esKeys = {
  all: ["es-entries"] as const,
  list: (filter: { companyId?: string; limit?: number } = {}) => ["es-entries", "list", filter] as const,
  detail: (id: string) => ["es-entries", "detail", id] as const,
};

/** ESの一覧。companyId でその企業のESだけに、limit で件数を絞れる。 */
export function useEsEntries(filter: { companyId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: esKeys.list(filter),
    queryFn: () => unwrap(api.GET("/v1/es-entries", { params: { query: filter } })),
  });
}

export function useEsEntry(id: string) {
  return useQuery({
    queryKey: esKeys.detail(id),
    queryFn: () => unwrap(api.GET("/v1/es-entries/{esEntryId}", { params: { path: { esEntryId: id } } })),
  });
}

export function useCreateEsEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EsEntryCreate) => unwrap(api.POST("/v1/es-entries", { body })),
    onSuccess: (entry) => {
      queryClient.setQueryData(esKeys.detail(entry.id), entry);
      void queryClient.invalidateQueries({ queryKey: ["es-entries", "list"] });
      // ESの締切はカレンダーにも表示されるため
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateEsEntry(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EsEntryUpdate) =>
      unwrap(api.PATCH("/v1/es-entries/{esEntryId}", { params: { path: { esEntryId: id } }, body })),
    onSuccess: (entry) => {
      queryClient.setQueryData(esKeys.detail(id), entry);
      void queryClient.invalidateQueries({ queryKey: ["es-entries", "list"] });
      // ESの締切はカレンダーにも表示されるため
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

/** ESを提出済みにする。XPが付くので、ヘッダーの表示も更新する。 */
export function useSubmitEsEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.POST("/v1/es-entries/{esEntryId}/submit", { params: { path: { esEntryId: id } } })),
    onSuccess: ({ esEntry, xp }) => {
      queryClient.setQueryData(esKeys.detail(esEntry.id), esEntry);
      void queryClient.invalidateQueries({ queryKey: ["es-entries", "list"] });
      // ESの締切はカレンダーにも表示されるため
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      applyXpResult(queryClient, xp);
    },
  });
}

export function useDeleteEsEntry(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE("/v1/es-entries/{esEntryId}", { params: { path: { esEntryId: id } } })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: esKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: ["es-entries", "list"] });
      // ESの締切はカレンダーにも表示されるため
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

/** AI添削を行う。結果はGoが保存し、返ってきたESでキャッシュを置き換える。 */
export function useReviewEsEntry(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/v1/es-entries/{esEntryId}/review", { params: { path: { esEntryId: id } } })),
    onSuccess: (entry) => queryClient.setQueryData(esKeys.detail(id), entry),
  });
}
