import Link from "next/link";
import { ArrowLeftIcon, ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { ROUTES } from "@/lib/constants/routes";

/** ESの作成・詳細ページで共通のヘッダーのリンク。 */
export function EsHeaderActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={ROUTES.HOME} className="sidebar-link-style text-sm">
        <HomeIcon className="h-4 w-4" />
        MVPへ
      </Link>
      <Link href={ROUTES.DASHBOARD} className="sidebar-link-style text-sm">
        <ArrowUturnLeftIcon className="h-4 w-4" />
        ダッシュボードへ
      </Link>
      <Link href={ROUTES.ES} className="sidebar-link-style text-sm">
        <ArrowLeftIcon className="h-4 w-4" />
        一覧へ戻る
      </Link>
    </div>
  );
}
