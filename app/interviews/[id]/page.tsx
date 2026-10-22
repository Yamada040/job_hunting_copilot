import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { InterviewDetail } from "../_components/interview-detail";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "面接ログの編集",
};

export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.interviewDetail} />}
      headerTitle="面接ログの編集"
      headerDescription="面接の記録を更新し、次の面接に役立てます"
      className="space-y-6"
    >
      <InterviewDetail id={id} />
    </AppLayout>
  );
}
