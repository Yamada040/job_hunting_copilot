"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import {
  useDeleteInterviewLog,
  useInterviewLog,
  useReviewInterviewLog,
  useUpdateInterviewLog,
  type InterviewLog,
} from "@/lib/api/interviews";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { InterviewForm } from "./interview-form";

export function InterviewDetail({ id }: { id: string }) {
  const { data: log, error } = useInterviewLog(id);

  if (error) return <ApiErrorMessage error={error} />;
  if (!log) return <p className="dq-card p-8 text-sm text-white">読み込み中…</p>;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return <InterviewDetailLoaded key={log.updatedAt} log={log} />;
}

function InterviewDetailLoaded({ log }: { log: InterviewLog }) {
  const router = useRouter();
  const updateLog = useUpdateInterviewLog(log.id);
  const deleteLog = useDeleteInterviewLog(log.id);
  const reviewLog = useReviewInterviewLog(log.id);
  const [saved, setSaved] = useState(false);

  const handleDelete = () => {
    if (!window.confirm(`${log.company.name}の${log.round ?? ""}面接ログを削除します。よろしいですか？`)) return;
    deleteLog.mutate(undefined, { onSuccess: () => router.push(ROUTES.INTERVIEWS) });
  };

  return (
    <div className="flex flex-col gap-6">
      <InterviewForm
        initial={log}
        submitLabel="保存する"
        pending={updateLog.isPending}
        error={updateLog.error}
        onSubmit={(values) => {
          setSaved(false);
          updateLog.mutate(values, { onSuccess: () => setSaved(true) });
        }}
      />
      {saved && <p className="text-sm text-emerald-300">保存しました</p>}

      <AiResultPanel
        title="AI振り返り"
        description="保存済みの面接ログをもとに、AIが良かった点・改善点・次回の行動をまとめます。何度でも実行でき、結果は上書きされます（1日の上限あり）。"
        result={log.aiResult}
        runLabel={log.aiResult ? "もう一度振り返る" : "AI振り返りを行う"}
        onRun={() => reviewLog.mutate()}
        pending={reviewLog.isPending}
        error={reviewLog.error}
      />

      <div className="space-y-2">
        <button type="button" onClick={handleDelete} disabled={deleteLog.isPending} className="dq-button-secondary">
          <TrashIcon className="h-4 w-4" />
          {deleteLog.isPending ? "削除中…" : "この面接ログを削除する"}
        </button>
        <ApiErrorMessage error={deleteLog.error} />
      </div>
    </div>
  );
}
