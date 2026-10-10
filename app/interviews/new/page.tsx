import { AppLayout } from "@/app/_components/layout";
import { InterviewHeaderActions } from "../_components/interview-header-actions";
import { NewInterviewForm } from "../_components/new-interview-form";

export default function InterviewNewPage() {
  return (
    <AppLayout
      headerTitle="面接終了後のログを追加"
      headerDescription="面接後の質問・回答・自己評価を記録し、次回改善に備えます。"
      headerActions={<InterviewHeaderActions />}
      className="space-y-6"
    >
      <NewInterviewForm />
    </AppLayout>
  );
}
