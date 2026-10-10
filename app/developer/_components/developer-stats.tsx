"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { api, ApiError, unwrap } from "@/lib/api/client";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

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
  if (!summary) return <div className="dq-card p-6 text-sm text-white">読み込み中…</div>;

  const activeRate = summary.totalUsers > 0 ? Math.round((summary.activeUsers7d / summary.totalUsers) * 100) : 0;
  const contentTotal = summary.totalEs + summary.totalCompanies + summary.totalInterviews;
  const maxBar = Math.max(summary.esCreated7d, summary.companiesCreated7d, summary.interviewsCreated7d, 1);
  const updatedAt = new Date(dataUpdatedAt).toLocaleString("ja-JP");

  return (
    <>
      <div className="rounded-2xl border border-white/35 bg-black/60 p-4 backdrop-blur-sm sm:p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="dq-window p-4">
            <p className="text-xs text-white/70">総ユーザー数</p>
            <p className="mt-2 text-3xl font-black text-white">{nf.format(summary.totalUsers)}</p>
          </div>
          <div className="dq-window p-4">
            <p className="text-xs text-white/70">7日アクティブユーザー</p>
            <p className="mt-2 text-3xl font-black text-emerald-200">{nf.format(summary.activeUsers7d)}</p>
            <p className="mt-1 text-xs text-white/60">稼働率 {activeRate}%</p>
          </div>
          <div className="dq-window p-4">
            <p className="text-xs text-white/70">7日新規ユーザー</p>
            <p className="mt-2 text-3xl font-black text-sky-200">{nf.format(summary.newUsers7d)}</p>
          </div>
          <div className="dq-window p-4">
            <p className="text-xs text-white/70">登録コンテンツ総数</p>
            <p className="mt-2 text-3xl font-black text-yellow-200">{nf.format(contentTotal)}</p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="dq-window p-5">
            <p className="dq-title">7日投稿グラフ</p>
            <div className="mt-5 space-y-4 text-sm text-white">
              {[
                { label: "ES", value: summary.esCreated7d, tone: "bg-sky-300" },
                { label: "企業", value: summary.companiesCreated7d, tone: "bg-emerald-300" },
                { label: "面接ログ", value: summary.interviewsCreated7d, tone: "bg-amber-300" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>{item.label}</span>
                    <span>{nf.format(item.value)}件</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/10 p-[2px]">
                    <div
                      className={`h-full rounded-full ${item.tone} transition-all`}
                      style={{ width: `${Math.max(8, Math.round((item.value / maxBar) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dq-window p-5">
            <p className="dq-title">稼働サマリー</p>
            <div className="mt-5 space-y-3 text-sm text-white">
              <div className="dq-item justify-between">
                <span>本日アクティブ</span>
                <span className="font-bold">{nf.format(summary.activeUsersToday)}人</span>
              </div>
              <div className="dq-item justify-between">
                <span>ES総数</span>
                <span className="font-bold">{nf.format(summary.totalEs)}件</span>
              </div>
              <div className="dq-item justify-between">
                <span>企業総数</span>
                <span className="font-bold">{nf.format(summary.totalCompanies)}件</span>
              </div>
              <div className="dq-item justify-between">
                <span>面接ログ総数</span>
                <span className="font-bold">{nf.format(summary.totalInterviews)}件</span>
              </div>
              <p className="pt-3 text-[11px] text-white/60">最終更新: {updatedAt}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
