import Link from "next/link";
import { ArrowUturnLeftIcon, HomeIcon, PlusIcon } from "@heroicons/react/24/outline";

import { AppLayout } from "@/app/_components/layout";
import { ROUTES } from "@/lib/constants/routes";
import { WebtestList } from "./_components/webtest-list";

export default function WebtestsPage() {
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
      <Link href={ROUTES.WEBTESTS_NEW} className="dq-button">
        <PlusIcon className="h-4 w-4" />
        問題を追加
      </Link>
    </div>
  );

  return (
    <AppLayout
      headerTitle="Webテスト対策（問題バンク）"
      headerDescription="オリジナル問題を登録・一覧表示して演習に備えます"
      headerActions={headerActions}
      className="space-y-6"
    >
      <WebtestList />
    </AppLayout>
  );
}
