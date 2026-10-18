"use client";

import { useRouter } from "next/navigation";

import { useUpdateWebtestQuestion, useWebtestQuestion } from "@/lib/api/webtests";
import { ROUTES } from "@/lib/constants/routes";
import { showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { FormSkeleton } from "@/app/_components/loading-skeletons";
import { LoadError } from "@/app/_components/load-error";
import { WebtestForm } from "./webtest-form";

export function EditWebtestForm({ id }: { id: string }) {
  const router = useRouter();
  const { data: question, error } = useWebtestQuestion(id);
  const updateQuestion = useUpdateWebtestQuestion(id);

  if (error) return <LoadError error={error} back={{ href: ROUTES.WEBTESTS, label: "問題の一覧へ戻る" }} />;
  if (!question) return <FormSkeleton fields={6} />;
  return (
    <WebtestForm
      initial={question}
      pending={updateQuestion.isPending}
      error={updateQuestion.error}
      onSubmit={(values) =>
        updateQuestion.mutate(values, {
          onSuccess: () => {
            showSuccessNotice("問題を保存しました");
            router.push(ROUTES.WEBTEST_DETAIL(id));
          },
        })
      }
    />
  );
}
