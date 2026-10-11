import Link from "next/link";
import { ArrowLeftIcon, ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

/** ESの作成・詳細ページで共通のヘッダーのリンク。 */
export function EsHeaderActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest">
        <Link href={ROUTES.HOME}>
          <HomeIcon className="h-4 w-4" />
          MVPへ
        </Link>
      </Button>
      <Button asChild variant="quest">
        <Link href={ROUTES.DASHBOARD}>
          <ArrowUturnLeftIcon className="h-4 w-4" />
          ダッシュボードへ
        </Link>
      </Button>
      <Button asChild variant="quest">
        <Link href={ROUTES.ES}>
          <ArrowLeftIcon className="h-4 w-4" />
          一覧へ戻る
        </Link>
      </Button>
    </div>
  );
}
