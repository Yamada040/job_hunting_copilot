import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { BrandLogo } from "@/app/_components/layout/BrandLogo";
import { LegalLinks } from "./legal-links";

/** プライバシーポリシーと利用規約の制定日。改定したら、改定日として足す */
export const LEGAL_ESTABLISHED = "2026年10月18日";

/** 運営者の表示。個人で開発・運営しているので、個人名ではなくサービスの運営者として示す */
export const OPERATOR_NAME = "就活copilot 運営者";

/**
 * ログインしていなくても読めるページ（プライバシーポリシー・利用規約）の枠。
 * ログイン後の画面の AppLayout を使わないのは、ログインしていない人にヘッダーのXPや下のメニューを出さないため。
 */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo className="text-lg font-semibold" logoClassName="h-10" />
          <Button asChild variant="link" size="sm">
            <Link href={ROUTES.HOME}>ホームへ戻る</Link>
          </Button>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl leading-tight font-black tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">制定日: {LEGAL_ESTABLISHED}</p>
        </div>
        {children}
        <LegalLinks className="pt-4" />
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-base font-semibold">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-7 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </CardContent>
    </Card>
  );
}
