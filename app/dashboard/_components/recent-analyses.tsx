"use client";

import Link from "next/link";
import { ArrowRightIcon, DocumentMagnifyingGlassIcon } from "@heroicons/react/24/outline";

import { useCompanies } from "@/lib/api/companies";
import { ROUTES } from "@/lib/constants/routes";
import { StaggerItem, StaggerList } from "@/app/_components/list/list-items";
import { LinesSkeleton } from "@/app/_components/loading-skeletons";
import { AnalysisPanel } from "./analysis-panel";
import { analysisPreview, recentAnalyses } from "./analysis-summaries";

const LIMIT = 3;
const PREVIEW_LENGTH = 60;

/** 最近AI企業分析をした企業と、分析結果の冒頭。押すとその企業の分析結果を開く。 */
export function RecentAnalyses({ className }: { className?: string }) {
  const { data: companies } = useCompanies();
  const analyzed = companies ? recentAnalyses(companies).slice(0, LIMIT) : null;

  return (
    <AnalysisPanel
      icon={DocumentMagnifyingGlassIcon}
      title="最近のAI分析"
      description="分析結果を開いて、ESや面接の準備に使えます"
      className={className}
    >
      {analyzed === null ? (
        <LinesSkeleton lines={LIMIT} />
      ) : analyzed.length === 0 ? (
        <p className="text-xs text-muted-foreground">分析した企業はまだありません。企業名を入れて試してみましょう</p>
      ) : (
        <StaggerList className="grid-cols-1 gap-2">
          {analyzed.map((company, index) => (
            <StaggerItem key={company.id} index={index}>
              <Link
                href={ROUTES.COMPANY_ANALYSIS(company.id)}
                className="group block rounded-xl bg-card px-3 py-1.5 ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex items-center gap-1 text-sm font-medium">
                  <span className="truncate">{company.name}</span>
                  <ArrowRightIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
                <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {analysisPreview(company.aiResult ?? "", PREVIEW_LENGTH)}
                </span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </AnalysisPanel>
  );
}
