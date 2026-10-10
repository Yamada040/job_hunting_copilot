import Link from "next/link";
import { ArrowLeftIcon, ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { ROUTES } from "@/lib/constants/routes";

/** 企業の登録・詳細ページで共通のヘッダーのリンク。 */
export function CompanyHeaderActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={ROUTES.HOME} className="dq-button-secondary">
        <HomeIcon className="h-4 w-4" />
        MVPホーム
      </Link>
      <Link href={ROUTES.DASHBOARD} className="dq-button-secondary">
        <ArrowUturnLeftIcon className="h-4 w-4" />
        ダッシュボードへ
      </Link>
      <Link href={ROUTES.COMPANIES} className="dq-button-secondary">
        <ArrowLeftIcon className="h-4 w-4" />
        一覧へ戻る
      </Link>
    </div>
  );
}
