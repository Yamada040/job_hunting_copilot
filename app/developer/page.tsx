import { AppLayout } from "@/app/_components/layout";
import { DeveloperStats } from "./_components/developer-stats";

export default function DeveloperDashboardPage() {
  return (
    <AppLayout headerTitle="開発者ダッシュボード" headerDescription="全体の利用状況を確認" className="space-y-6">
      <DeveloperStats />
    </AppLayout>
  );
}
