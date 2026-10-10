import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, ApiError, unwrap } from "./client";
import type { components } from "./schema";
import { applyXpResult } from "./xp";

export type AptitudeAnswers = components["schemas"]["AptitudeAnswers"];
export type AptitudeResult = components["schemas"]["AptitudeResult"];
export type SelfAnalysisAnswers = components["schemas"]["SelfAnalysisAnswers"];
export type SelfAnalysisResult = components["schemas"]["SelfAnalysisResult"];

const aptitudeKey = ["aptitude-result"] as const;
const selfAnalysisKey = ["self-analysis-result"] as const;

/** 404（まだ回答していない）を null に変える。それ以外のエラーはそのまま投げる。 */
async function orNull<T>(result: Promise<T>): Promise<T | null> {
  try {
    return await result;
  } catch (e) {
    if (e instanceof ApiError && e.problem.status === 404) return null;
    throw e;
  }
}

/** 適性診断の回答と診断結果。まだ回答していなければ null。 */
export function useAptitudeResult() {
  return useQuery({ queryKey: aptitudeKey, queryFn: () => orNull(unwrap(api.GET("/v1/aptitude-result"))) });
}

export function useSubmitAptitude() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: AptitudeAnswers) => unwrap(api.POST("/v1/aptitude-result", { body: { answers } })),
    onSuccess: ({ result, xp }) => {
      queryClient.setQueryData(aptitudeKey, result);
      applyXpResult(queryClient, xp);
    },
  });
}

export function useDiagnoseAptitude() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/v1/aptitude-result/diagnosis")),
    onSuccess: (result) => queryClient.setQueryData(aptitudeKey, result),
  });
}

/** 自己分析の回答と分析結果。まだ回答していなければ null。 */
export function useSelfAnalysisResult() {
  return useQuery({
    queryKey: selfAnalysisKey,
    queryFn: () => orNull(unwrap(api.GET("/v1/self-analysis-result"))),
  });
}

export function useSubmitSelfAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: SelfAnalysisAnswers) => unwrap(api.POST("/v1/self-analysis-result", { body: { answers } })),
    onSuccess: ({ result, xp }) => {
      queryClient.setQueryData(selfAnalysisKey, result);
      applyXpResult(queryClient, xp);
    },
  });
}

export function useAnalyzeSelf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/v1/self-analysis-result/analysis")),
    onSuccess: (result) => queryClient.setQueryData(selfAnalysisKey, result),
  });
}
