import Link from "next/link";
import { PlusIcon, ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";
import { ROUTES } from "@/lib/constants/routes";
import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EsListClient } from "./_components/es-list-client";

export default function EsListPage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest">
        <Link href={ROUTES.HOME}>
          <HomeIcon className="h-4 w-4" />
          MVPホーム
        </Link>
      </Button>
      <Button asChild variant="quest">
        <Link href={ROUTES.DASHBOARD}>
          <ArrowUturnLeftIcon className="h-4 w-4" />
          ダッシュボードへ
        </Link>
      </Button>
      <Button asChild variant="quest">
        <Link href={ROUTES.ES_NEW}>
          <PlusIcon className="h-4 w-4" />
          新規作成
        </Link>
      </Button>
    </div>
  );

  return (
    <AppLayout
      headerTitle="ES管理"
      headerDescription="下書きと提出済みを分けて管理できます"
      headerActions={headerActions}
      className="space-y-4"
    >
      <Card className="py-6">
        <CardHeader className="px-6">
          <CardTitle>
            <h2 className="text-sm font-semibold text-sky-600">ES一覧</h2>
          </CardTitle>
          <CardDescription>下書きと提出済みをタブレス表示。</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <Card variant="muted" className="px-4">
            <EsListClient />
          </Card>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
