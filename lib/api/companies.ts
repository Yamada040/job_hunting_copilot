import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { components } from "./schema";
import { applyXpResult } from "./xp";

export type Company = components["schemas"]["Company"];
/** 一覧の企業。分析結果は全文ではなく冒頭（aiResultPreview）だけを持つ。 */
export type CompanyListItem = components["schemas"]["CompanyListItem"];
export type CompanyStage = components["schemas"]["CompanyStage"];
export type CompanyCreate = components["schemas"]["CompanyCreate"];
export type CompanyUpdate = components["schemas"]["CompanyUpdate"];

export const companyKeys = {
  all: ["companies"] as const,
  list: (query = "") => ["companies", "list", query] as const,
  detail: (id: string) => ["companies", "detail", id] as const,
  analysis: ["companies", "analysis"] as const,
};

/** 企業の一覧の問い合わせ。画面の外（入力欄の送信時など）で fetchQuery するときも、同じキャッシュを使う。 */
export const companiesQuery = (query = "") => ({
  queryKey: companyKeys.list(query),
  queryFn: () => unwrap(api.GET("/v1/companies", { params: { query: query ? { q: query } : {} } })),
});

/** 企業の一覧。query を渡すと、正規化した企業名の部分一致で絞り込む（候補の表示に使う）。 */
export function useCompanies(query = "") {
  return useQuery(companiesQuery(query));
}

/** 企業1件の問い合わせ。画面の外（入力欄の送信時など）で fetchQuery するときも、同じキャッシュを使う。 */
export const companyQuery = (id: string) => ({
  queryKey: companyKeys.detail(id),
  queryFn: () => unwrap(api.GET("/v1/companies/{companyId}", { params: { path: { companyId: id } } })),
});

export function useCompany(id: string) {
  return useQuery(companyQuery(id));
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyCreate) => unwrap(api.POST("/v1/companies", { body })),
    onSuccess: ({ company, xp }) => {
      queryClient.setQueryData(companyKeys.detail(company.id), company);
      void queryClient.invalidateQueries({ queryKey: companyKeys.all });
      applyXpResult(queryClient, xp);
    },
  });
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyUpdate) =>
      unwrap(api.PATCH("/v1/companies/{companyId}", { params: { path: { companyId: id } }, body })),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail(id), company);
      void queryClient.invalidateQueries({ queryKey: ["companies", "list"] });
    },
  });
}

export function useDeleteCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE("/v1/companies/{companyId}", { params: { path: { companyId: id } } })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: companyKeys.detail(id) });
      // 企業を消すと、ひも付くES・面接ログ・予定もサーバー側で消えるため、それらのキャッシュもまとめて捨てる
      void queryClient.invalidateQueries();
    },
  });
}

/** ESなど他の項目にひも付く企業の、表示に必要な最小限の情報。 */
export type CompanySummary = components["schemas"]["CompanySummary"];

/**
 * AI企業分析を行う（企業ごとに1回）。結果はバックエンドが保存し、返ってきた企業でキャッシュを置き換える。
 * ホームの入力欄で始めた分析を企業の詳細の画面でも「処理中」と出せるよう、状態はこのフックの戻り値ではなく
 * useCompanyAnalysis で企業ごとに読む（数十秒かかるので、待つ間に画面を移っても続きを見せたい）。
 */
export function useAnalyzeCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: companyKeys.analysis,
    mutationFn: (id: string) =>
      unwrap(api.POST("/v1/companies/{companyId}/analysis", { params: { path: { companyId: id } } })),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail(company.id), company);
      void queryClient.invalidateQueries({ queryKey: ["companies", "list"] });
    },
  });
}

/** その企業への、いちばん新しいAI企業分析の状態。どの画面から始めたものでも返す。まだ無ければ undefined。 */
export function useCompanyAnalysis(id: string) {
  const states = useMutationState({
    filters: { mutationKey: companyKeys.analysis, predicate: (mutation) => mutation.state.variables === id },
    select: (mutation) => mutation.state,
  });
  return states.at(-1);
}
