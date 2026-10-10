import Link from "next/link";
import { ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { AppLayout } from "@/app/_components/layout";
import { ROUTES } from "@/lib/constants/routes";
import { NewWebtestForm } from "../_components/new-webtest-form";

export default function WebtestNewPage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Link href={ROUTES.WEBTESTS} className="dq-button-secondary">
        <ArrowUturnLeftIcon className="h-4 w-4" />
        一覧へ戻る
      </Link>
      <Link href={ROUTES.DASHBOARD} className="dq-button-secondary">
        <HomeIcon className="h-4 w-4" />
        ダッシュボードへ
      </Link>
    </div>
  );

  return (
    <AppLayout
      headerTitle="Webテスト問題を追加"
      headerDescription="オリジナル問題を登録し、演習に使います"
      headerActions={headerActions}
    >
      <NewWebtestForm />
    </AppLayout>
  );
}
