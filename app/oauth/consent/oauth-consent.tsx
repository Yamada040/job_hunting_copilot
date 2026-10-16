"use client";

import type { OAuthAuthorizationDetails } from "@supabase/auth-js";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase-browser";

type ConsentState =
  { kind: "loading" } | { kind: "ready"; details: OAuthAuthorizationDetails } | { kind: "error"; message: string };

export function OAuthConsent({ authorizationID }: { authorizationID: string }) {
  const [state, setState] = useState<ConsentState>({ kind: "loading" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationID);
        if (error || !data) throw error ?? new Error("認可内容を取得できませんでした。");
        if (!("authorization_id" in data)) {
          window.location.assign(data.redirect_url);
          return;
        }
        setState({ kind: "ready", details: data });
      } catch (error) {
        console.error("getAuthorizationDetails error", error);
        setState({ kind: "error", message: "認可内容を確認できませんでした。最初から接続し直してください。" });
      }
    };
    void load();
  }, [authorizationID]);

  const decide = async (action: "approve" | "deny") => {
    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const response =
        action === "approve"
          ? await supabase.auth.oauth.approveAuthorization(authorizationID, { skipBrowserRedirect: true })
          : await supabase.auth.oauth.denyAuthorization(authorizationID, { skipBrowserRedirect: true });
      if (response.error || !response.data) throw response.error ?? new Error("認可を完了できませんでした。");
      window.location.assign(response.data.redirect_url);
    } catch (error) {
      console.error("OAuth consent error", error);
      setState({ kind: "error", message: "認可を完了できませんでした。もう一度お試しください。" });
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">MCP connection</p>
          <CardTitle>
            <h1 className="text-2xl font-semibold">AIクライアントへの接続を許可しますか？</h1>
          </CardTitle>
          <CardDescription>
            許可すると、このクライアントは就活記録を読み取れます。書き込みや削除は許可されません。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" ? <p className="text-sm text-muted-foreground">認可内容を確認しています…</p> : null}
          {state.kind === "error" ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          {state.kind === "ready" ? (
            <dl className="space-y-3 rounded-lg border p-4 text-sm">
              <div>
                <dt className="text-muted-foreground">接続するアプリ</dt>
                <dd className="font-medium">{state.details.client.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">要求する権限</dt>
                <dd>{state.details.scope || "基本情報"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">接続後の戻り先</dt>
                <dd className="break-all">{state.details.redirect_uri}</dd>
              </div>
            </dl>
          ) : null}
        </CardContent>
        {state.kind === "ready" ? (
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" disabled={isSubmitting} onClick={() => void decide("deny")}>
              拒否する
            </Button>
            <Button disabled={isSubmitting} onClick={() => void decide("approve")}>
              {isSubmitting ? "処理中..." : "読み取りを許可する"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </main>
  );
}
