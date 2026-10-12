"use client";

import Link from "next/link";
import { SparklesIcon } from "@heroicons/react/24/outline";

import { useEsReviews, useReviewEsEntry, type EsReview } from "@/lib/api/es";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { EsReviewItemCard } from "./es-review-item";

/** AI添削の実行と、最新の添削結果・総合点の推移の表示。 */
export function EsReviewPanel({ entryId, companyId }: { entryId: string; companyId: string }) {
  const { data: reviews, error: loadError } = useEsReviews(entryId);
  const reviewEsEntry = useReviewEsEntry(entryId);
  const latest = reviews?.[0];

  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <SparklesIcon className="h-5 w-5 text-sky-500" />
            AI添削
          </h2>
        </CardTitle>
        <CardDescription className="text-xs">
          保存済みの設問・回答と本文を、企業分析と自己分析の結果も踏まえて、構成・具体性・企業との一致の3観点で10点満点で採点し、修正版を作ります。文字数の上限を入れた設問は、修正版を上限の9割〜上限に収めます。編集した内容は、保存してから添削してください（1日の上限あり）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        <Button
          type="button"
          variant="default"
          onClick={() => reviewEsEntry.mutate()}
          disabled={reviewEsEntry.isPending}
        >
          {reviewEsEntry.isPending
            ? "AIが処理中です（数十秒かかることがあります）…"
            : latest
              ? "もう一度添削する"
              : "AI添削する"}
        </Button>
        <ApiErrorMessage error={reviewEsEntry.error ?? loadError} />

        {reviews && reviews.length === 0 && (
          <p className="rounded-xl border border-dashed bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground">
            まだ添削結果はありません。実行すると、ここに表示されます。
          </p>
        )}

        {latest && (
          <div className="space-y-4">
            <OverallScore reviews={reviews} />
            <UsedAnalyses review={latest} companyId={companyId} />
            <p className="whitespace-pre-line text-sm leading-6">{latest.summary}</p>
            {latest.items.map((item, index) => (
              <EsReviewItemCard key={index} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 最新の総合点と、これまでの総合点の推移（古い順）。 */
function OverallScore({ reviews }: { reviews: EsReview[] }) {
  const [latest, previous] = reviews;
  const history = reviews
    .map((review) => review.overallScore)
    .filter((score) => score !== null)
    .reverse();
  const diff =
    latest.overallScore !== null && previous?.overallScore != null ? latest.overallScore - previous.overallScore : null;

  return (
    <Card variant="muted" className="gap-1 px-4 py-3">
      <p className="text-xs text-muted-foreground">総合点（全項目・全観点の平均）</p>
      <p className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary">{latest.overallScore?.toFixed(1) ?? "—"}</span>
        <span className="text-sm text-muted-foreground">/ 10</span>
        {diff !== null && (
          <span className="text-sm font-semibold text-primary">
            前回から {diff >= 0 ? "+" : ""}
            {diff.toFixed(1)}
          </span>
        )}
      </p>
      {history.length > 1 && (
        <p className="text-xs text-muted-foreground">推移：{history.map((score) => score.toFixed(1)).join(" → ")}</p>
      )}
    </Card>
  );
}

/** 添削に使った分析結果。無かったものは、行えば添削が良くなることを案内する。 */
function UsedAnalyses({ review, companyId }: { review: EsReview; companyId: string }) {
  const missing = [
    !review.usedCompanyAnalysis && {
      href: ROUTES.COMPANY_DETAIL(companyId),
      label: "企業分析",
      effect: "「企業との一致」が採点されます",
    },
    !review.usedSelfAnalysis && {
      href: ROUTES.SELF_ANALYSIS,
      label: "自己分析",
      effect: "あなたの強みを活かせているかも指摘されます",
    },
  ].filter((item) => item !== false);

  if (missing.length === 0) {
    return <p className="text-xs text-muted-foreground">企業分析と自己分析の結果を踏まえて添削しました。</p>;
  }
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {missing.map((item) => (
        <li key={item.label}>
          <Link href={item.href} className="font-semibold text-primary underline-offset-2 hover:underline">
            {item.label}
          </Link>
          をしてからもう一度添削すると、{item.effect}。
        </li>
      ))}
    </ul>
  );
}
