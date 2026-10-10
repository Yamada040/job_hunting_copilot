import Link from "next/link";
import { ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";

import { ROUTES } from "@/lib/constants/routes";

/** 面接ログの作成・詳細ページで共通のヘッダーのリンク。 */
export function InterviewHeaderActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={ROUTES.INTERVIEWS} className="dq-button-secondary">
        <ArrowUturnLeftIcon className="h-4 w-4" />
        一覧へ戻る
      </Link>
      <Link href={ROUTES.HOME} className="dq-button-secondary">
        <HomeIcon className="h-4 w-4" />
        MVPホーム
      </Link>
    </div>
  );
}
