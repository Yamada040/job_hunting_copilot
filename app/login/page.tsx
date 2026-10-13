import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { BrandLogo } from "@/app/_components/layout/BrandLogo";
import { LoginClient } from "./login-client";

export default async function LoginPage() {
  return (
    <div className="relative min-h-screen">
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12 sm:py-16">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo className="text-lg font-semibold" logoClassName="h-10" />
          <Button asChild variant="link" size="sm">
            <Link href={ROUTES.HOME}>ホームへ戻る</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Sign in</p>
            <CardTitle>
              <h1 className="text-2xl font-semibold">ログイン</h1>
            </CardTitle>
            <CardDescription>Googleアカウントでサインインしてください。</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginClient />
          </CardContent>
          <CardFooter className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              サインイン後は、アカウントに紐づくデータが自動で読み込まれます。
            </p>
            <Button asChild variant="outline" className="text-xs">
              <Link href={ROUTES.DASHBOARD}>ダッシュボードを見る</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
