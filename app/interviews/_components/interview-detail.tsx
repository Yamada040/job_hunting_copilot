"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  useDeleteInterviewLog,
  useInterviewLog,
  useReviewInterviewLog,
  useUpdateInterviewLog,
  type InterviewLog,
} from "@/lib/api/interviews";
import { ROUTES } from "@/lib/constants/routes";
import { showFailureNotice } from "@/app/_components/avatar/avatar-notice-store";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { InterviewForm } from "./interview-form";
import { FormSkeleton } from "@/app/_components/loading-skeletons";
import { LoadError } from "@/app/_components/load-error";

export function InterviewDetail({ id }: { id: string }) {
  const { data: log, error } = useInterviewLog(id);
  // 保存すると下の key が変わって作り直され、中で持つ状態は消えるので、「保存しました」はここで持つ
  const [saved, setSaved] = useState(false);

  if (error) return <LoadError error={error} back={{ href: ROUTES.INTERVIEWS, label: "面接ログの一覧へ戻る" }} />;
  if (!log) return <FormSkeleton />;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return <InterviewDetailLoaded key={log.updatedAt} log={log} saved={saved} onSavedChange={setSaved} />;
}

function InterviewDetailLoaded({
  log,
  saved,
  onSavedChange: setSaved,
}: {
  log: InterviewLog;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const router = useRouter();
  const updateLog = useUpdateInterviewLog(log.id);
  const deleteLog = useDeleteInterviewLog(log.id);
  const reviewLog = useReviewInterviewLog(log.id);

  const handleDelete = () => {
    deleteLog.mutate(undefined, {
      onSuccess: () => router.push(ROUTES.INTERVIEWS),
      onError: (e) => showFailureNotice("面接ログの削除", e),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <InterviewForm
        initial={log}
        submitLabel="保存する"
        pending={updateLog.isPending}
        error={updateLog.error}
        saved={saved}
        onSubmit={(values) => {
          setSaved(false);
          updateLog.mutate(values, { onSuccess: () => setSaved(true) });
        }}
      />

      <AiResultPanel
        title="AI振り返り"
        description="保存済みの面接ログをもとに、AIが良かった点・改善点・次回の行動をまとめます。何度でも実行でき、結果は上書きされます（1日の上限あり）。"
        result={log.aiResult}
        runLabel={log.aiResult ? "もう一度振り返る" : "AI振り返りを行う"}
        onRun={() => reviewLog.mutate(undefined, { onError: (e) => showFailureNotice("AI振り返り", e) })}
        pending={reviewLog.isPending}
      />

      <div className="space-y-2">
        <ConfirmDialog
          title="面接ログを削除しますか？"
          description={`${log.company.name}の${log.round ?? ""}面接ログを削除します。よろしいですか？`}
          confirmLabel="削除する"
          destructive
          onConfirm={handleDelete}
          trigger={
            <Button type="button" variant="destructive" disabled={deleteLog.isPending}>
              {deleteLog.isPending ? "削除中…" : "この面接ログを削除する"}
            </Button>
          }
        />
      </div>
    </div>
  );
}
