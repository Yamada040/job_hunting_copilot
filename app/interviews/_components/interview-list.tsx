"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInterviewLogs } from "@/lib/api/interviews";
import { ROUTES } from "@/lib/constants/routes";
import { INTERVIEW_FORMAT_LABELS } from "@/lib/interviews/labels";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { EmptyState } from "@/app/_components/empty-state";

export function InterviewList() {
  const { data: logs, error, isPending } = useInterviewLogs();

  if (error) return <ApiErrorMessage error={error} />;
  if (isPending) return <Card className="p-6 text-sm">読み込み中…</Card>;
  if (logs.length === 0) {
    return (
      <EmptyState
        title="まだ面接ログがありません"
        description="面接で聞かれた質問と答えを記録して、次の面接に活かしましょう。"
      >
        <Button asChild variant="default">
          <Link href={ROUTES.INTERVIEWS_NEW}>面接ログを追加する</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {logs.map((log) => (
        <Link key={log.id} href={ROUTES.INTERVIEW_DETAIL(log.id)} className="block transition hover:-translate-y-0.5">
          <Card className="h-full gap-2 p-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{log.round ?? "回次未設定"}</Badge>
              <span className="text-xs text-muted-foreground">{log.interviewDate ?? "日付未設定"}</span>
            </div>
            <div className="text-base font-semibold">{log.company.name}</div>
            <div className="text-xs">{log.format ? INTERVIEW_FORMAT_LABELS[log.format] : "面接形式未設定"}</div>
            {log.aiResult && <Badge className="mt-1 bg-success/10 text-[11px] text-success">振り返り結果あり</Badge>}
            <div className="truncate text-xs text-muted-foreground">{log.improvement ?? "振り返りは未入力です"}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
