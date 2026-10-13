import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { StatusScreen } from "./_components/status-screen";

/** 無いURLを開いたときの画面。ログインしていなければ、この画面より先にログイン画面へ送られる（proxy.ts）。 */
export default function NotFound() {
  return (
    <StatusScreen
      title="ページが見つかりません"
      description="URLが間違っているか、ページが移動した可能性があります。"
      messages={["道に迷っちゃった？", "下のメニューからも戻れるよ"]}
    >
      <Button asChild>
        <Link href={ROUTES.DASHBOARD}>ホームへ戻る</Link>
      </Button>
    </StatusScreen>
  );
}
