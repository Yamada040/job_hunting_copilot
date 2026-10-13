"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import { useDeleteEsEntry, useEsEntry, useSubmitEsEntry, useUpdateEsEntry, type EsEntry } from "@/lib/api/es";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { EsForm } from "./es-form";
import { EsReviewPanel } from "./es-review-panel";
import { FormSkeleton } from "@/app/_components/loading-skeletons";

export function EsDetail({ id }: { id: string }) {
  const { data: entry, error } = useEsEntry(id);
  // 保存すると下の key が変わって作り直され、中で持つ状態は消えるので、「保存しました」はここで持つ
  const [saved, setSaved] = useState(false);

  if (error) return <ApiErrorMessage error={error} />;
  if (!entry) return <FormSkeleton />;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return <EsDetailLoaded key={entry.updatedAt} entry={entry} saved={saved} onSavedChange={setSaved} />;
}

function EsDetailLoaded({
  entry,
  saved,
  onSavedChange: setSaved,
}: {
  entry: EsEntry;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const router = useRouter();
  const updateEsEntry = useUpdateEsEntry(entry.id);
  const submitEsEntry = useSubmitEsEntry();
  const deleteEsEntry = useDeleteEsEntry(entry.id);

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
        saved={saved}
        onSubmit={(values, submit) => {
          setSaved(false);
          updateEsEntry.mutate(values, {
            onSuccess: () => (submit ? submitEsEntry.mutate(entry.id) : setSaved(true)),
          });
        }}
      />

      <EsReviewPanel entryId={entry.id} companyId={entry.company.id} />

      <div className="space-y-2">
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive" disabled={deleteEsEntry.isPending}>
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
