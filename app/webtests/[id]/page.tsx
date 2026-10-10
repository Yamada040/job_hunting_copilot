import Link from "next/link";
import { ArrowLeftIcon, ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { AppLayout } from "@/app/_components/layout";
import { ROUTES } from "@/lib/constants/routes";
import { WebtestDetail } from "../_components/webtest-detail";

export default async function WebtestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Link href={ROUTES.WEBTESTS} className="dq-button-secondary">
        <ArrowLeftIcon className="h-4 w-4" />
        一覧へ戻る
      </Link>
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
      headerTitle="Webテストの問題"
      headerDescription="問題を解いて結果を記録します"
      headerActions={headerActions}
      className="space-y-6"
    >
      <WebtestDetail id={id} />
    </AppLayout>
  );
}
