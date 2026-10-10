import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { components } from "./schema";
import { applyXpResult } from "./xp";

export type Company = components["schemas"]["Company"];
export type CompanyStage = components["schemas"]["CompanyStage"];
export type CompanyCreate = components["schemas"]["CompanyCreate"];
export type CompanyUpdate = components["schemas"]["CompanyUpdate"];

export const companyKeys = {
  all: ["companies"] as const,
  list: (query = "") => ["companies", "list", query] as const,
  detail: (id: string) => ["companies", "detail", id] as const,
};

/** 企業の一覧。query を渡すと、正規化した企業名の部分一致で絞り込む（候補の表示に使う）。 */
export function useCompanies(query = "") {
  return useQuery({
    queryKey: companyKeys.list(query),
    queryFn: () => unwrap(api.GET("/v1/companies", { params: { query: query ? { q: query } : {} } })),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => unwrap(api.GET("/v1/companies/{companyId}", { params: { path: { companyId: id } } })),
  });
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
