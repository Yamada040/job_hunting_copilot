import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { AppLayout } from "@/app/_components/layout";
import { DashboardView } from "./_components/dashboard-view";

export default function DashboardPage() {
  const navigationActions = (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild variant="quest">
        <Link href={ROUTES.HOME}>ホームへ</Link>
      </Button>
      <Button asChild variant="quest">
        <Link href={ROUTES.ES_NEW}>
          <PlusIcon className="h-4 w-4" />
          ESを追加
        </Link>
      </Button>
      <Button asChild variant="quest">
        <Link href={ROUTES.COMPANIES_NEW}>
          <PlusIcon className="h-4 w-4" />
          企業を追加
        </Link>
      </Button>
    </div>
  );
  return (
    <AppLayout headerActions={navigationActions} className="space-y-6">
      <DashboardView />
    </AppLayout>
  );
}
