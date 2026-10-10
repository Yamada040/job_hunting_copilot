import Link from "next/link";
import { ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { AppLayout } from "@/app/_components/layout";
import { ROUTES } from "@/lib/constants/routes";
import SelfAnalysisForm from "./_components/self-analysis-form";

export default function SelfAnalysisPage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Link href={ROUTES.DASHBOARD} className="dq-button-secondary">
        <ArrowUturnLeftIcon className="h-4 w-4" />
        ダッシュボードへ
      </Link>
      <Link href={ROUTES.HOME} className="dq-button-secondary">
        <HomeIcon className="h-4 w-4" />
        MVPホーム
      </Link>
    </div>
  );

  return (
    <AppLayout
      headerTitle="自己分析"
      headerDescription="強み・価値観・モチベーションをAIで整理し、キャリアの軸を言語化します"
      headerActions={headerActions}
      className="space-y-6"
    >
      <SelfAnalysisForm />
    </AppLayout>
  );
}
