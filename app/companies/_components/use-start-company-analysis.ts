"use client";

import { useAnalyzeCompany, type Company } from "@/lib/api/companies";
import { ROUTES } from "@/lib/constants/routes";
import { noticeWhenDone } from "@/app/_components/avatar/avatar-notice-store";

/** AI企業分析を始め、終わったら結果をアバターに話させる。ホームの入力欄・パネルと企業の詳細の画面で使う。 */
export function useStartCompanyAnalysis() {
  const analyzeCompany = useAnalyzeCompany();
  return (company: Pick<Company, "id" | "name">) =>
    noticeWhenDone(analyzeCompany.mutateAsync(company.id), {
      action: `「${company.name}」のAI企業分析`,
      done: `「${company.name}」のAI企業分析が終わりました`,
      link: { href: ROUTES.COMPANY_ANALYSIS(company.id), label: "結果を見る" },
    });
}
