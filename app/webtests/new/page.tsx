import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { NewWebtestForm } from "../_components/new-webtest-form";

export default function WebtestNewPage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.WEBTESTS}>一覧へ戻る</Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.DASHBOARD}>ダッシュボードへ</Link>
      </Button>
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
