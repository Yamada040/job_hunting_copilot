import { AppLayout } from "@/app/_components/layout";
import { InterviewDetail } from "../_components/interview-detail";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.interviewDetail} />}
      headerTitle="面接ログを編集"
      headerDescription="面接後のログを更新し、次回改善に役立ててください。"
      className="space-y-6"
    >
      <InterviewDetail id={id} />
    </AppLayout>
  );
}
