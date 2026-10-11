import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { WebtestDetail } from "../_components/webtest-detail";

export default async function WebtestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.WEBTESTS}>一覧へ戻る</Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.DASHBOARD}>ダッシュボードへ</Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.HOME}>MVPホーム</Link>
      </Button>
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
