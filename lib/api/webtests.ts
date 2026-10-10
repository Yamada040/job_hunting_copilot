import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { components } from "./schema";
import { applyXpResult } from "./xp";

export type WebtestQuestionSummary = components["schemas"]["WebtestQuestionSummary"];
export type WebtestQuestionDetail = components["schemas"]["WebtestQuestionDetail"];
export type WebtestQuestionCreate = components["schemas"]["WebtestQuestionCreate"];

const webtestKeys = {
  list: (testType = "") => ["webtest-questions", "list", testType] as const,
  detail: (id: string) => ["webtest-questions", "detail", id] as const,
};

/** 自分が作った問題の一覧。testType でテストの種類を絞れる。 */
export function useWebtestQuestions(testType = "") {
  return useQuery({
    queryKey: webtestKeys.list(testType),
    queryFn: () => unwrap(api.GET("/v1/webtest-questions", { params: { query: testType ? { testType } : {} } })),
  });
}

export function useWebtestQuestion(id: string) {
  return useQuery({
    queryKey: webtestKeys.detail(id),
    queryFn: () =>
      unwrap(api.GET("/v1/webtest-questions/{webtestQuestionId}", { params: { path: { webtestQuestionId: id } } })),
  });
}

/** 問題を作る。XPが付くので、ヘッダーの表示も更新する。 */
export function useCreateWebtestQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: WebtestQuestionCreate) => unwrap(api.POST("/v1/webtest-questions", { body })),
    onSuccess: ({ question, xp }) => {
      queryClient.setQueryData(webtestKeys.detail(question.id), question);
      void queryClient.invalidateQueries({ queryKey: ["webtest-questions", "list"] });
      applyXpResult(queryClient, xp);
    },
  });
}

/** 問題に解答する。正誤はGoが判定する。解答の記録を取り直すため、問題の詳細のキャッシュを捨てる。 */
export function useAnswerWebtestQuestion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { answer: string; timeSpent?: number }) =>
      unwrap(
        api.POST("/v1/webtest-questions/{webtestQuestionId}/attempts", {
          params: { path: { webtestQuestionId: id } },
          body,
        }),
      ),
    onSuccess: ({ xp }) => {
      void queryClient.invalidateQueries({ queryKey: webtestKeys.detail(id) });
      applyXpResult(queryClient, xp);
    },
  });
}
