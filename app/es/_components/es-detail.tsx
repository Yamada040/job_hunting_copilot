"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import {
  useDeleteEsEntry,
  useEsEntry,
  useReviewEsEntry,
  useSubmitEsEntry,
  useUpdateEsEntry,
  type EsEntry,
} from "@/lib/api/es";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { EsForm } from "./es-form";

export function EsDetail({ id }: { id: string }) {
  const { data: entry, error } = useEsEntry(id);

  if (error) return <ApiErrorMessage error={error} />;
  if (!entry) return <Card className="p-8 text-sm">読み込み中…</Card>;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return <EsDetailLoaded key={entry.updatedAt} entry={entry} />;
}

function EsDetailLoaded({ entry }: { entry: EsEntry }) {
  const router = useRouter();
  const updateEsEntry = useUpdateEsEntry(entry.id);
  const submitEsEntry = useSubmitEsEntry();
  const deleteEsEntry = useDeleteEsEntry(entry.id);
  const reviewEsEntry = useReviewEsEntry(entry.id);
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        状態：{entry.status === "submitted" ? "提出済み（下書きには戻せません）" : "下書き"}
      </p>

      <EsForm
        initial={entry}
        canSubmit={entry.status === "draft"}
        pending={updateEsEntry.isPending || submitEsEntry.isPending}
        error={updateEsEntry.error ?? submitEsEntry.error}
        onSubmit={(values, submit) => {
          setSaved(false);
          updateEsEntry.mutate(values, {
            onSuccess: () => (submit ? submitEsEntry.mutate(entry.id) : setSaved(true)),
          });
        }}
      />
      {saved && <p className="text-sm text-emerald-600">保存しました</p>}

      <AiResultPanel
        title="AI添削"
        description="保存済みの設問・回答と本文をAIが添削します。編集した内容は、保存してから添削してください。何度でも実行でき、結果は上書きされます（1日の上限あり）。"
        result={entry.aiResult}
        runLabel={entry.aiResult ? "もう一度添削する" : "AI添削する"}
        onRun={() => reviewEsEntry.mutate()}
        pending={reviewEsEntry.isPending}
        error={reviewEsEntry.error}
      />

      <div className="space-y-2">
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="quest"
              disabled={deleteEsEntry.isPending}
              className="text-destructive hover:text-destructive/80"
            >
              <TrashIcon className="h-4 w-4" />
              {deleteEsEntry.isPending ? "削除中…" : "このESを削除する"}
            </Button>
          }
          title="ESを削除しますか？"
          description={`「${entry.title}」を削除します。よろしいですか？`}
          confirmLabel="削除する"
          destructive
          onConfirm={() => deleteEsEntry.mutate(undefined, { onSuccess: () => router.push(ROUTES.ES) })}
        />
        <ApiErrorMessage error={deleteEsEntry.error} />
      </div>
    </div>
  );
}
