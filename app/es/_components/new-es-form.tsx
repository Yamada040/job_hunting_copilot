"use client";

import { useRouter } from "next/navigation";

import { useCreateEsEntry, useSubmitEsEntry } from "@/lib/api/es";
import { ROUTES } from "@/lib/constants/routes";
import { showFailureNotice, showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { EsForm } from "./es-form";

export function NewEsForm() {
  const router = useRouter();
  const createEsEntry = useCreateEsEntry();
  const submitEsEntry = useSubmitEsEntry();

  return (
    <EsForm
      canSubmit
      defaultQuestions={[
        { prompt: "自己PR・強み・成果", answer: "" },
        { prompt: "志望動機", answer: "" },
      ]}
      pending={createEsEntry.isPending || submitEsEntry.isPending}
      error={createEsEntry.error ?? submitEsEntry.error}
      onSubmit={({ deadline, ...values }, submit) =>
        createEsEntry.mutate(
          { ...values, deadline: deadline ?? undefined },
          {
            // 作成は常に下書き。提出するときは、作成に続けて提出のAPIを呼ぶ（docs/backend-design.md 5章）
            onSuccess: (entry) => {
              if (!submit) {
                showSuccessNotice("ESを下書き保存しました");
                return router.push(ROUTES.ES_DETAIL(entry.id));
              }
              // 提出に失敗しても下書きはできているので詳細へ移る。移るとフォームのエラーは見えないので、アバターに伝えさせる
              submitEsEntry.mutate(entry.id, {
                onSuccess: () => showSuccessNotice("ESを提出しました"),
                onError: (e) => showFailureNotice("ESの提出", e),
                onSettled: () => router.push(ROUTES.ES_DETAIL(entry.id)),
              });
            },
          },
        )
      }
    />
  );
}
