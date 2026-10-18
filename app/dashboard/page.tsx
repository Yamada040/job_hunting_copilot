import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { DashboardView } from "./_components/dashboard-view";

export const metadata: Metadata = {
  title: "ダッシュボード",
};

export default function DashboardPage() {
  return (
    <AppLayout className="space-y-6">
      <DashboardView />
    </AppLayout>
  );
}
