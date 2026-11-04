"use client";

import { useRouter } from "next/navigation";

import { useOptionalCompany } from "@/lib/api/companies";
import { useCreateInterviewLog } from "@/lib/api/interviews";
import { ROUTES } from "@/lib/constants/routes";
import { showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { FormSkeleton } from "@/app/_components/loading-skeletons";
import { InterviewForm } from "./interview-form";

/** companyId を渡すと、その企業を選んだ状態で始める（見つからなければ選ばずに始める）。 */
export function NewInterviewForm({ companyId }: { companyId?: string }) {
  const router = useRouter();
  const createLog = useCreateInterviewLog();
  const preselected = useOptionalCompany(companyId);

  // フォームは最初に描いたときの値で企業の欄を作るので、届くまで待つ
  if (companyId && preselected.isPending) return <FormSkeleton />;

  return (
    <InterviewForm
      defaultCompany={preselected.data && { id: preselected.data.id, name: preselected.data.name }}
      submitLabel="記録する"
      pending={createLog.isPending}
      error={createLog.error}
      onSubmit={(values) =>
        createLog.mutate(values, {
          onSuccess: ({ interviewLog }) => {
            showSuccessNotice("面接ログを記録しました");
            router.push(ROUTES.INTERVIEW_DETAIL(interviewLog.id));
          },
        })
      }
    />
  );
}
