import Link from "next/link";
import { ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import AptitudeForm from "./_components/aptitude-form";

export default function AptitudePage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.DASHBOARD}>
          <ArrowUturnLeftIcon className="h-4 w-4" />
          ダッシュボードへ
        </Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.HOME}>
          <HomeIcon className="h-4 w-4" />
          MVPホーム
        </Link>
      </Button>
    </div>
  );

  return (
    <AppLayout
      headerTitle="適性チェック"
      headerDescription="興味・強み・価値観を整理して、AI診断で適性の方向性を確認します"
      headerActions={headerActions}
      className="space-y-6"
    >
      <AptitudeForm />
    </AppLayout>
  );
}
