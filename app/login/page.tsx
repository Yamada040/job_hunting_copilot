import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/next-path";
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
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
            <LoginClient nextPath={safeNextPath(next)} />
          </CardContent>
          {/* ログインしていないとダッシュボードは開けない（ログイン画面へ戻される）ので、そこへのボタンは置かない */}
          <CardFooter className="flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">
              ログインすると、
              <Link href={ROUTES.TERMS} className="text-primary underline underline-offset-4">
                利用規約
              </Link>
              と
              <Link href={ROUTES.PRIVACY} className="text-primary underline underline-offset-4">
                プライバシーポリシー
              </Link>
              に同意したものとします。サインイン後は、アカウントに紐づくデータが自動で読み込まれます。
            </p>
            <p className="text-xs text-muted-foreground">
              ログインできないときは
              <Link href={ROUTES.CONTACT} className="underline underline-offset-4 hover:text-foreground">
                お問い合わせ
              </Link>
              からご連絡ください。
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
