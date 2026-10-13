import { AppLayout } from "@/app/_components/layout";
import { NewInterviewForm } from "../_components/new-interview-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export default function InterviewNewPage() {
  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.interviewNew} />}
      headerTitle="面接終了後のログを追加"
      headerDescription="面接後の質問・回答・自己評価を記録し、次回改善に備えます。"
      className="space-y-6"
    >
      <NewInterviewForm />
    </AppLayout>
  );
}
