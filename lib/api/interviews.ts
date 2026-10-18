import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { components } from "./schema";
import { applyXpResult } from "./xp";

export type InterviewLog = components["schemas"]["InterviewLog"];
/** 一覧の面接ログ。質問と回答・振り返り結果は持たず、振り返り済みか（reviewed）だけを持つ。 */
export type InterviewLogSummary = components["schemas"]["InterviewLogSummary"];
export type InterviewQuestion = components["schemas"]["InterviewQuestion"];
export type InterviewFormat = components["schemas"]["InterviewFormat"];
export type InterviewRating = components["schemas"]["InterviewRating"];
export type InterviewLogCreate = components["schemas"]["InterviewLogCreate"];
export type InterviewLogUpdate = components["schemas"]["InterviewLogUpdate"];

export const interviewKeys = {
  all: ["interview-logs"] as const,
  list: (filter: { companyId?: string; limit?: number } = {}) => ["interview-logs", "list", filter] as const,
  detail: (id: string) => ["interview-logs", "detail", id] as const,
};

/** 面接ログの一覧（面接日の新しい順）。companyId でその企業の面接ログだけに、limit で件数を絞れる。 */
export function useInterviewLogs(filter: { companyId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: interviewKeys.list(filter),
    queryFn: () => unwrap(api.GET("/v1/interview-logs", { params: { query: filter } })),
  });
}

export function useInterviewLog(id: string) {
  return useQuery({
    queryKey: interviewKeys.detail(id),
    queryFn: () => unwrap(api.GET("/v1/interview-logs/{interviewLogId}", { params: { path: { interviewLogId: id } } })),
  });
}

/** 面接ログを作る。XPが付くので、ヘッダーの表示も更新する。 */
export function useCreateInterviewLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InterviewLogCreate) => unwrap(api.POST("/v1/interview-logs", { body })),
    onSuccess: ({ interviewLog, xp }) => {
      queryClient.setQueryData(interviewKeys.detail(interviewLog.id), interviewLog);
      void queryClient.invalidateQueries({ queryKey: ["interview-logs", "list"] });
      applyXpResult(queryClient, xp);
    },
  });
}

export function useUpdateInterviewLog(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InterviewLogUpdate) =>
      unwrap(api.PATCH("/v1/interview-logs/{interviewLogId}", { params: { path: { interviewLogId: id } }, body })),
    onSuccess: (log) => {
      queryClient.setQueryData(interviewKeys.detail(id), log);
      void queryClient.invalidateQueries({ queryKey: ["interview-logs", "list"] });
    },
  });
}

export function useDeleteInterviewLog(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(api.DELETE("/v1/interview-logs/{interviewLogId}", { params: { path: { interviewLogId: id } } })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: interviewKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: ["interview-logs", "list"] });
    },
  });
}

/** AI振り返りを行う。結果はバックエンドが保存し、返ってきた面接ログでキャッシュを置き換える。 */
export function useReviewInterviewLog(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(api.POST("/v1/interview-logs/{interviewLogId}/review", { params: { path: { interviewLogId: id } } })),
    onSuccess: (log) => queryClient.setQueryData(interviewKeys.detail(id), log),
  });
}
