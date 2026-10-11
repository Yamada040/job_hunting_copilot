import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

/** 面接ログの作成・詳細ページで共通のヘッダーのリンク。 */
export function InterviewHeaderActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.INTERVIEWS}>一覧へ戻る</Link>
      </Button>
      <Button asChild variant="quest-muted">
        <Link href={ROUTES.HOME}>MVPホーム</Link>
      </Button>
    </div>
  );
}
