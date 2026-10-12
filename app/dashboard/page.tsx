import { AppLayout } from "@/app/_components/layout";
import { DashboardView } from "./_components/dashboard-view";

export default function DashboardPage() {
  return (
    <AppLayout className="space-y-6">
      <DashboardView />
    </AppLayout>
  );
}
