"use client";

import { useRouter } from "next/navigation";

import { useCreateWebtestQuestion } from "@/lib/api/webtests";
import { ROUTES } from "@/lib/constants/routes";
import { showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { WebtestForm } from "./webtest-form";

export function NewWebtestForm() {
  const router = useRouter();
  const createQuestion = useCreateWebtestQuestion();

  return (
    <WebtestForm
      pending={createQuestion.isPending}
      error={createQuestion.error}
      onSubmit={(values) =>
        createQuestion.mutate(values, {
          onSuccess: () => {
            showSuccessNotice("問題を作りました");
            router.push(ROUTES.WEBTESTS);
          },
        })
      }
    />
  );
}
