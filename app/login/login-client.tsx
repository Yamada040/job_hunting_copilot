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
      return { error: (err as Error)?.message ?? "Googleログインに失敗しました" };
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
