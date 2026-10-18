"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { StatusScreen } from "./_components/status-screen";

/**
 * 画面を描く途中で想定外のエラーが起きたときの画面。ヘッダーと下のメニューはルートのレイアウトにあるので残り、
 * そこからほかの画面へ移れる。詳しい内容は利用者には見せず、コンソールにだけ出す。
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      title="問題が発生しました"
      description="画面を表示できませんでした。もう一度試すか、ホームから開き直してください。"
      messages={["ごめんね、うまく表示できなかった", "もう一度試してみて"]}
    >
      <Button type="button" onClick={reset}>
        <ArrowPathIcon />
        もう一度試す
      </Button>
      <Button asChild variant="outline">
        <Link href={ROUTES.DASHBOARD}>ホームへ戻る</Link>
      </Button>
    </StatusScreen>
  );
}
