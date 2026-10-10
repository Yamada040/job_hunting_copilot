import Link from "next/link";
import { ArrowUturnLeftIcon, HomeIcon, PlusIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "@/app/_components/layout";
import { ROUTES } from "@/lib/constants/routes";
import { InterviewList } from "./_components/interview-list";

export default function InterviewsListPage() {
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
      <Link href={ROUTES.INTERVIEWS_NEW} className="dq-button">
        <PlusIcon className="h-4 w-4" />
        面接終了後のログを追加
      </Link>
    </div>
  );

  return (
    <AppLayout
      headerTitle="面接ログ一覧"
      headerDescription="面接後の質問・回答ログと振り返りを一覧表示し、詳細ページで更新できます。"
      headerActions={headerActions}
      className="space-y-6"
    >
      <InterviewList />
    </AppLayout>
  );
}
