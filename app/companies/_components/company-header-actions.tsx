import Link from "next/link";
import { ArrowLeftIcon, ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

/** 企業の登録・詳細ページで共通のヘッダーのリンク。 */
export function CompanyHeaderActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.HOME}>
          <HomeIcon className="h-4 w-4" />
          MVPホーム
        </Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.DASHBOARD}>
          <ArrowUturnLeftIcon className="h-4 w-4" />
          ダッシュボードへ
        </Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.COMPANIES}>
          <ArrowLeftIcon className="h-4 w-4" />
          一覧へ戻る
        </Link>
      </Button>
    </div>
  );
}
