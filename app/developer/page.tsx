import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { DeveloperStats } from "./_components/developer-stats";

export default function DeveloperDashboardPage() {
  return (
    <AppLayout
      headerTitle="開発者ダッシュボード"
      headerDescription="全体の利用状況を確認"
      headerActions={
        <Button asChild variant="quest-muted">
          <Link href={ROUTES.DASHBOARD}>ダッシュボードへ</Link>
        </Button>
      }
      className="space-y-6"
    >
      <DeveloperStats />
    </AppLayout>
  );
}
