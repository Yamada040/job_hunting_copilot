"use client";

import { useRouter } from "next/navigation";

import { useCreateInterviewLog } from "@/lib/api/interviews";
import { ROUTES } from "@/lib/constants/routes";
import { InterviewForm } from "./interview-form";

export function NewInterviewForm() {
  const router = useRouter();
  const createLog = useCreateInterviewLog();

  return (
    <InterviewForm
      submitLabel="記録する"
      pending={createLog.isPending}
      error={createLog.error}
      onSubmit={(values) =>
        createLog.mutate(values, {
          onSuccess: ({ interviewLog }) => router.push(ROUTES.INTERVIEW_DETAIL(interviewLog.id)),
        })
      }
    />
  );
}
