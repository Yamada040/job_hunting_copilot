import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { BrandLogo } from "@/app/_components/layout/BrandLogo";
import { LoginClient } from "./login-client";

// ログイン画面へ送るときに付ける ?error= と、そのときに出す説明
const LOGIN_ERRORS: Record<string, string> = {
  auth: "ログインに失敗しました。もう一度お試しください。",
  session: "ログインの有効期限が切れました。もう一度ログインしてください。",
  logout: "ほかの端末からのログアウトに失敗しました。この端末からはログアウトしています。",
};

export const metadata: Metadata = {
  title: "ログイン",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const errorMessage = error ? LOGIN_ERRORS[error] : undefined;

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
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <LoginClient />
          </CardContent>
          {/* ログインしていないとダッシュボードは開けない（ログイン画面へ戻される）ので、そこへのボタンは置かない */}
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              サインイン後は、アカウントに紐づくデータが自動で読み込まれます。
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
