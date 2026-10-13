import { AppLayout } from "@/app/_components/layout";
import { DeveloperStats } from "./_components/developer-stats";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export default function DeveloperDashboardPage() {
  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.developer} />}
      headerTitle="開発者ダッシュボード"
      headerDescription="全体の利用状況を確認"
      className="space-y-6"
    >
      <DeveloperStats />
    </AppLayout>
  );
}
