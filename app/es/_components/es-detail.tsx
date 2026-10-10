"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import { useDeleteEsEntry, useEsEntry, useSubmitEsEntry, useUpdateEsEntry, type EsEntry } from "@/lib/api/es";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { EsForm } from "./es-form";

export function EsDetail({ id }: { id: string }) {
  const { data: entry, error } = useEsEntry(id);

  if (error) return <ApiErrorMessage error={error} />;
  if (!entry) return <p className="dq-card p-8 text-sm text-white">読み込み中…</p>;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return <EsDetailLoaded key={entry.updatedAt} entry={entry} />;
}

function EsDetailLoaded({ entry }: { entry: EsEntry }) {
  const router = useRouter();
  const updateEsEntry = useUpdateEsEntry(entry.id);
  const submitEsEntry = useSubmitEsEntry();
  const deleteEsEntry = useDeleteEsEntry(entry.id);
  const [saved, setSaved] = useState(false);

  const handleDelete = () => {
    if (!window.confirm(`「${entry.title}」を削除します。よろしいですか？`)) return;
    deleteEsEntry.mutate(undefined, { onSuccess: () => router.push(ROUTES.ES) });
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-white/80">
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
      {saved && <p className="text-sm text-emerald-300">保存しました</p>}

      <div className="space-y-2">
        <button type="button" onClick={handleDelete} disabled={deleteEsEntry.isPending} className="dq-button-secondary">
          <TrashIcon className="h-4 w-4" />
          {deleteEsEntry.isPending ? "削除中…" : "このESを削除する"}
        </button>
        <ApiErrorMessage error={deleteEsEntry.error} />
      </div>
    </div>
  );
}
