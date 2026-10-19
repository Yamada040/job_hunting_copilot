import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { NewInterviewForm } from "../_components/new-interview-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "面接ログを追加",
};

export default function InterviewNewPage() {
  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.interviewNew} />}
      headerTitle="面接ログを追加"
      headerDescription="面接で聞かれたこと・答えたこと・手応えを記録し、次の面接に備えます"
      className="space-y-6"
    >
      <NewInterviewForm />
    </AppLayout>
  );
}
