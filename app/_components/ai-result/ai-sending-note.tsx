import Link from "next/link";

import { ROUTES } from "@/lib/constants/routes";

/** AIの実行ボタンの近くに置く、外部のAIへ送ることの説明 */
export function AiSendingNote() {
  return (
    <p className="text-xs text-muted-foreground">
      実行すると、保存済みの内容を外部のAI（Google Gemini または OpenAI）に送ります。氏名・大学は送りません（
      <Link href={ROUTES.PRIVACY} className="text-primary underline underline-offset-4">
        プライバシーポリシー
      </Link>
      ）。
    </p>
  );
}
