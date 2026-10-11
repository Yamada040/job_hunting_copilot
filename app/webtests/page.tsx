import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { WebtestList } from "./_components/webtest-list";

export default function WebtestsPage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.DASHBOARD}>ダッシュボードへ</Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.HOME}>MVPホーム</Link>
      </Button>
      <Button asChild variant="quest">
        <Link href={ROUTES.WEBTESTS_NEW}>問題を追加</Link>
      </Button>
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
