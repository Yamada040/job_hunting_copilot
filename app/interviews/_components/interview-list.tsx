"use client";

import Link from "next/link";

import { useInterviewLogs } from "@/lib/api/interviews";
import { ROUTES } from "@/lib/constants/routes";
import { INTERVIEW_FORMAT_LABELS } from "@/lib/interviews/labels";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

export function InterviewList() {
  const { data: logs, error, isPending } = useInterviewLogs();

  if (error) return <ApiErrorMessage error={error} />;
  if (isPending) return <div className="dq-card p-6 text-sm text-white">読み込み中…</div>;
  if (logs.length === 0) {
    return (
      <div className="dq-card p-6 text-sm text-white">
        まだ面接ログがありません。右上の「面接終了後のログを追加」から記録を始めてください。
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {logs.map((log) => (
        <Link
          key={log.id}
          href={ROUTES.INTERVIEW_DETAIL(log.id)}
          className="dq-card flex flex-col gap-2 p-4 text-sm text-white transition hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
              {log.round ?? "回次未設定"}
            </span>
            <span className="text-xs">{log.interviewDate ?? "日付未設定"}</span>
          </div>
          <div className="text-base font-semibold">{log.company.name}</div>
          <div className="text-xs">{log.format ? INTERVIEW_FORMAT_LABELS[log.format] : "面接形式未設定"}</div>
          {log.aiResult && (
            <div className="mt-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">振り返り結果あり</div>
          )}
          <div className="truncate text-xs">{log.improvement ?? "振り返りは未入力です"}</div>
        </Link>
      ))}
    </div>
  );
}
