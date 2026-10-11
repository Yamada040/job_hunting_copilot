import Link from "next/link";
import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { InterviewList } from "./_components/interview-list";

export default function InterviewsListPage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.DASHBOARD}>ダッシュボードへ</Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.HOME}>MVPホーム</Link>
      </Button>
      <Button asChild variant="quest">
        <Link href={ROUTES.INTERVIEWS_NEW}>面接終了後のログを追加</Link>
      </Button>
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
