import Link from "next/link";
import { ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import SelfAnalysisForm from "./_components/self-analysis-form";

export default function SelfAnalysisPage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.DASHBOARD}>
          <ArrowUturnLeftIcon className="h-4 w-4" />
          ダッシュボードへ
        </Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.HOME}>
          <HomeIcon className="h-4 w-4" />
          MVPホーム
        </Link>
      </Button>
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
