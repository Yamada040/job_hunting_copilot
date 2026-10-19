"use client";

import type { OAuthGrant } from "@supabase/auth-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase-browser";

const formatGrantedAt = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function ConnectedApps() {
  const queryClient = useQueryClient();
  const grants = useQuery({
    queryKey: ["oauth-grants"],
    queryFn: async () => {
      const { data, error: listError } = await createSupabaseBrowserClient().auth.oauth.listGrants();
      if (listError) throw listError;
      return data ?? [];
    },
  });
  const revoke = useMutation({
    mutationFn: async (clientID: string) => {
      const { error: revokeError } = await createSupabaseBrowserClient().auth.oauth.revokeGrant({ clientId: clientID });
      if (revokeError) throw revokeError;
    },
    onSuccess: (_, clientID) => {
      queryClient.setQueryData<OAuthGrant[]>(["oauth-grants"], (current) =>
        current?.filter((grant) => grant.client.id !== clientID),
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-semibold">接続済みAIアプリ</h2>
        </CardTitle>
        <CardDescription>
          AIアプリに許可した就活記録の読み取りを確認・取り消しできます。取り消すと、そのアプリは再度許可するまで利用できません。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {grants.isError || revoke.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {revoke.isError
                ? "接続を取り消せませんでした。時間をおいて再度お試しください。"
                : "接続済みアプリを読み込めませんでした。時間をおいて再度お試しください。"}
            </AlertDescription>
          </Alert>
        ) : null}
        {grants.isPending ? <p className="text-sm text-muted-foreground">接続済みアプリを確認しています…</p> : null}
        {grants.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">接続済みのAIアプリはありません。</p>
        ) : null}
        {grants.data?.map((grant) => (
          <div
            key={grant.client.id}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="font-medium">{grant.client.name}</p>
              <p className="text-xs text-muted-foreground">許可日時: {formatGrantedAt(grant.granted_at)}</p>
              {grant.scopes.length > 0 ? (
                <p className="text-xs text-muted-foreground">権限: {grant.scopes.join(" ")}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={revoke.isPending}
              onClick={() => revoke.mutate(grant.client.id)}
            >
              {revoke.isPending && revoke.variables === grant.client.id ? "取り消し中…" : "接続を取り消す"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
