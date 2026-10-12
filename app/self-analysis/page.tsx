import { AppLayout } from "@/app/_components/layout";
import SelfAnalysisForm from "./_components/self-analysis-form";

export default function SelfAnalysisPage() {
  return (
    <AppLayout
      headerTitle="自己分析"
      headerDescription="強み・価値観・モチベーションをAIで整理し、キャリアの軸を言語化します"
      className="space-y-6"
    >
      <SelfAnalysisForm />
    </AppLayout>
  );
}
