import { AppLayout } from "@/app/_components/layout";
import SelfAnalysisForm from "./_components/self-analysis-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export default function SelfAnalysisPage() {
  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.selfAnalysis} />}
      headerTitle="自己分析"
      headerDescription="強み・価値観・モチベーションをAIで整理し、キャリアの軸を言語化します"
      className="space-y-6"
    >
      <SelfAnalysisForm />
    </AppLayout>
  );
}
