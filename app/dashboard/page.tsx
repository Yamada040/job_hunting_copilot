import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";

import { ROUTES } from "@/lib/constants/routes";
import { AppLayout } from "@/app/_components/layout";
import { DashboardView } from "./_components/dashboard-view";

export default function DashboardPage() {
  const navigationActions = (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={ROUTES.HOME} className="dq-button">
        ホームへ
      </Link>
      <Link href={ROUTES.ES_NEW} className="dq-button">
        <PlusIcon className="h-4 w-4" />
        ESを追加
      </Link>
      <Link href={ROUTES.COMPANIES_NEW} className="dq-button">
        <PlusIcon className="h-4 w-4" />
        企業を追加
      </Link>
    </div>
  );
  return (
    <AppLayout headerActions={navigationActions} className="space-y-6">
      <DashboardView />
    </AppLayout>
  );
}
