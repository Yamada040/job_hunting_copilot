"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";

import { ROUTES } from "@/lib/constants/routes";
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
  // ログインとホームはログイン前の画面なので出さない
  if (pathname === ROUTES.HOME || pathname === ROUTES.LOGIN) return null;
  // 問い合わせはログインしなくても開ける。ログインしているかが分かるまではレベル・XPを出さない
  // （ログインしていないのに読みに行くと、エラーになるだけなので）
  if (pathname === ROUTES.CONTACT && signedIn !== true) {
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
