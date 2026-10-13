"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BuildingOfficeIcon, SparklesIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useAnalyzeCompany, useCompanies, useCompanyAnalysis, type Company } from "@/lib/api/companies";
import { COMPANY_STAGE_LABELS } from "@/lib/companies/stages";
import { ROUTES } from "@/lib/constants/routes";
import { StaggerItem, StaggerList } from "@/app/_components/list/list-items";
import { LinesSkeleton } from "@/app/_components/loading-skeletons";
import { AnalysisPanel } from "./analysis-panel";
import { pendingAnalyses } from "./analysis-summaries";

const LIMIT = 3;

/** まだAI企業分析をしていない企業。押すとその場で分析を始め、終わると右の「最近のAI分析」へ移る。 */
export function PendingAnalyses({ className }: { className?: string }) {
  const { data: companies } = useCompanies();
  const pending = companies ? pendingAnalyses(companies) : null;

  return (
    <AnalysisPanel
      icon={BuildingOfficeIcon}
      title="AI分析がまだの企業"
      description="ホームから移らずに、その場で分析できます"
      count={pending?.length}
      className={className}
    >
      {pending === null ? (
        <LinesSkeleton lines={LIMIT} />
      ) : pending.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {companies?.length ? "登録した企業はすべて分析済みです" : "企業名を入れて分析すると、企業も登録されます"}
        </p>
      ) : (
        <StaggerList className="grid-cols-1 gap-2">
          {pending.slice(0, LIMIT).map((company, index) => (
            <StaggerItem key={company.id} index={index}>
              <PendingRow company={company} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </AnalysisPanel>
  );
}

function PendingRow({ company }: { company: Company }) {
  const analyzeCompany = useAnalyzeCompany();
  const analysis = useCompanyAnalysis(company.id);
  const running = analysis?.status === "pending";
  const error = analysis?.status === "error" ? analysis.error : null;

  return (
    <div className="space-y-1">
      <div className="relative flex items-center gap-2 overflow-clip rounded-xl bg-card px-3 py-1.5 ring-1 ring-border">
        {running && <Shimmer />}
        <Link href={ROUTES.COMPANY_DETAIL(company.id)} className="relative min-w-0 flex-1 hover:text-primary">
          <span className="block truncate text-sm font-medium">{company.name}</span>
          <span className="block text-xs text-muted-foreground">{COMPANY_STAGE_LABELS[company.stage]}</span>
        </Link>
        <Button
          type="button"
          size="sm"
          className="relative"
          disabled={running}
          onClick={() => analyzeCompany.mutate(company.id)}
        >
          <SparklesIcon />
          {running ? "分析中…" : "分析"}
        </Button>
      </div>
      {error !== null && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error instanceof ApiError ? error.problem.title : "通信に失敗しました。時間をおいて再度お試しください。"}
        </p>
      )}
    </div>
  );
}

/** 分析中の行に光を流し、待っている間も進んでいることを見せる（https://motion-reference.takayustudio.jp/#motion=ui-loading-skeleton-shimmer） */
function Shimmer() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <span aria-hidden className="absolute inset-0 bg-accent/60" />;
  return (
    <motion.span
      aria-hidden
      className="absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-accent to-transparent"
      initial={{ x: "-100%" }}
      animate={{ x: "200%" }}
      transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
    />
  );
}
