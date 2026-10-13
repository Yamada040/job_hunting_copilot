"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError, unwrap } from "@/lib/api/client";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { AiUsageTable } from "./ai-usage-table";

const nf = new Intl.NumberFormat("ja-JP");

/** 開発者向けの利用状況。開発者かどうかはバックエンドが判定し、開発者でなければ 403 が返るのでダッシュボードへ戻す。 */
export function DeveloperStats() {
  const router = useRouter();
  const {
    data: summary,
    error,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => unwrap(api.GET("/v1/admin/stats")),
  });
  const forbidden = error instanceof ApiError && error.problem.status === 403;

  useEffect(() => {
    if (forbidden) router.replace(ROUTES.DASHBOARD);
  }, [forbidden, router]);

  if (error) return forbidden ? null : <ApiErrorMessage error={error} />;
  if (!summary) return <Card className="p-6 text-sm">読み込み中…</Card>;

  const activeRate = summary.totalUsers > 0 ? Math.round((summary.activeUsers7d / summary.totalUsers) * 100) : 0;
  const contentTotal = summary.totalEs + summary.totalCompanies + summary.totalInterviews;
  const maxBar = Math.max(summary.esCreated7d, summary.companiesCreated7d, summary.interviewsCreated7d, 1);
  const updatedAt = new Date(dataUpdatedAt).toLocaleString("ja-JP");

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-0 p-4">
          <p className="text-xs text-muted-foreground">総ユーザー数</p>
          <p className="mt-2 text-3xl font-black">{nf.format(summary.totalUsers)}</p>
        </Card>
        <Card className="gap-0 p-4">
          <p className="text-xs text-muted-foreground">7日アクティブユーザー</p>
          <p className="mt-2 text-3xl font-black text-success">{nf.format(summary.activeUsers7d)}</p>
          <p className="mt-1 text-xs text-muted-foreground">稼働率 {activeRate}%</p>
        </Card>
        <Card className="gap-0 p-4">
          <p className="text-xs text-muted-foreground">7日新規ユーザー</p>
          <p className="mt-2 text-3xl font-black text-primary">{nf.format(summary.newUsers7d)}</p>
        </Card>
        <Card className="gap-0 p-4">
          <p className="text-xs text-muted-foreground">登録コンテンツ総数</p>
          <p className="mt-2 text-3xl font-black text-primary">{nf.format(contentTotal)}</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 py-6">
          <CardHeader className="px-6">
            <CardTitle>
              <h2 className="text-base font-semibold">7日投稿グラフ</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <div className="space-y-4 text-sm">
              {[
                { label: "ES", value: summary.esCreated7d, tone: "bg-category-es" },
                { label: "企業", value: summary.companiesCreated7d, tone: "bg-ring" },
                { label: "面接ログ", value: summary.interviewsCreated7d, tone: "bg-category-interview" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{item.label}</span>
                    <span>{nf.format(item.value)}件</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary p-[2px]">
                    <div
                      className={`h-full rounded-full ${item.tone} transition-all`}
                      style={{ width: `${Math.max(8, Math.round((item.value / maxBar) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4 py-6">
          <CardHeader className="px-6">
            <CardTitle>
              <h2 className="text-base font-semibold">稼働サマリー</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <div className="space-y-3 text-sm">
              <SummaryRow label="本日アクティブ" value={`${nf.format(summary.activeUsersToday)}人`} />
              <SummaryRow label="ES総数" value={`${nf.format(summary.totalEs)}件`} />
              <SummaryRow label="企業総数" value={`${nf.format(summary.totalCompanies)}件`} />
              <SummaryRow label="面接ログ総数" value={`${nf.format(summary.totalInterviews)}件`} />
              <p className="pt-3 text-[11px] text-muted-foreground">最終更新: {updatedAt}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <AiUsageTable usage={summary.aiUsage} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
