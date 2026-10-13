"use client";

import { usePathname } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";

import { ROUTES } from "@/lib/constants/routes";
import { XpBadge } from "../xp-badge";
import { Header } from "./Header";

/**
 * ログイン後の画面に共通のヘッダー。XPが増えたときの動きやレベルアップの演出が、画面を移っても途切れないよう、
 * 各画面ではなくルートのレイアウトに置き、画面を移っても作り直さない（企業を登録すると詳細の画面へ移るなど）。
 */
export function AppHeader() {
  const pathname = usePathname();
  // ログインとホームはログイン前の画面なので出さない
  if (pathname === ROUTES.HOME || pathname === ROUTES.LOGIN) return null;
  return (
    <Header
      leftContent={<XpBadge />}
      rightContent={
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" size="sm">
            <ArrowRightOnRectangleIcon />
            ログアウト
          </Button>
        </form>
      }
      showBrand
    />
  );
}
