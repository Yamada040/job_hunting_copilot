"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";

import { PUBLIC_PAGES, ROUTES, STANDALONE_PAGES } from "@/lib/constants/routes";
import { useSignedIn } from "@/lib/supabase/use-signed-in";
import { XpBadge } from "../xp-badge";
import { Header } from "./Header";

/**
 * ログイン後の画面に共通のヘッダー。XPが増えたときの動きやレベルアップの演出が、画面を移っても途切れないよう、
 * 各画面ではなくルートのレイアウトに置き、画面を移っても作り直さない（企業を登録すると詳細の画面へ移るなど）。
 */
export function AppHeader() {
  const pathname = usePathname();
  const signedIn = useSignedIn();
  // 自分で枠を描く画面では出さない
  if (STANDALONE_PAGES.includes(pathname)) return null;
  // ログインしなくても開ける画面（問い合わせ）では、ログインしているかが分かるまでレベル・XPを出さない
  // （ログインしていないのに読みに行くと、エラーになるだけなので）
  if (PUBLIC_PAGES.includes(pathname) && signedIn !== true) {
    return <Header rightContent={signedIn === false ? <GuestLinks /> : null} showBrand />;
  }
  return (
    <Header
      leftContent={<XpBadge />}
      rightContent={
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="ログアウト" className="sm:w-auto sm:px-2.5">
            <ArrowRightOnRectangleIcon />
            <span className="hidden sm:inline">ログアウト</span>
          </Button>
        </form>
      }
      showBrand
    />
  );
}

function GuestLinks() {
  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link href={ROUTES.HOME}>ホーム</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={ROUTES.LOGIN}>ログイン</Link>
      </Button>
    </div>
  );
}
