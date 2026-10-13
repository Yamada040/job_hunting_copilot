"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase-browser";

export function LoginClient() {
  const [state, formAction, isPending] = useActionState<{ error: string } | null, FormData>(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signInError) throw signInError;
      // OAuthページへ遷移するまで「リダイレクト中...」表示を維持する
      await new Promise<never>(() => {});
      return null;
    } catch (err) {
      console.error("signInWithOAuth error", err);
      // supabase-js のメッセージは英語で、利用者には意味が分からないので出さない
      return { error: "Googleログインを始められませんでした。時間をおいてもう一度お試しください。" };
    }
  }, null);

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <Button type="submit" size="lg" disabled={isPending} className="w-full">
          {isPending ? "リダイレクト中..." : "Googleでログイン"}
        </Button>
      </form>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
