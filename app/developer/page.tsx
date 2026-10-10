import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { ROUTES } from "@/lib/constants/routes";
import { DeveloperStats } from "./_components/developer-stats";

export default function DeveloperDashboardPage() {
  return (
    <AppLayout
      headerTitle="開発者ダッシュボード"
      headerDescription="全体の利用状況を確認"
      headerActions={
        <Link href={ROUTES.DASHBOARD} className="mvp-button mvp-button-secondary">
          ダッシュボードへ
        </Link>
      }
      className="space-y-6"
    >
      <DeveloperStats />
    </AppLayout>
  );
}
