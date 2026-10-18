"use client";

import { TrashIcon } from "@heroicons/react/24/outline";

import { useDeleteMe } from "@/lib/api/me";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase-browser";
import { showFailureNotice } from "@/app/_components/avatar/avatar-notice-store";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** 退会（アカウントとすべてのデータの削除）。消したあとはこの端末からログアウトしてトップへ移る。 */
export function DeleteAccount() {
  const deleteMe = useDeleteMe();

  const handleConfirm = () =>
    deleteMe.mutate(undefined, {
      onSuccess: () =>
        // サーバー側のセッションはユーザーと一緒に消えているので、/auth/signout（全端末のログアウト）ではなくこの端末の Cookie だけを消す。
        // router.push ではなくページごと読み込み直し、手元に残っている TanStack Query のキャッシュも確実に消す
        void createSupabaseBrowserClient()
          .auth.signOut({ scope: "local" })
          .finally(() => window.location.replace(new URL(ROUTES.HOME, window.location.origin))),
      onError: (e) => showFailureNotice("退会", e),
    });

  return (
    <Card className="gap-4 px-6 py-6">
      <CardHeader className="px-0">
        <CardTitle>
          <h2 className="text-base font-bold">退会する</h2>
        </CardTitle>
        <CardDescription>
          アカウントと、企業・ES・面接ログ・予定・XPなど、このアプリに保存したデータをすべて削除します。削除したデータは元に戻せません。
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive" disabled={deleteMe.isPending}>
              <TrashIcon className="h-4 w-4" />
              {deleteMe.isPending ? "退会しています…" : "退会する"}
            </Button>
          }
          title="本当に退会しますか？"
          description="アカウントと、保存したすべてのデータ（企業・ES・面接ログ・予定・XPなど）を削除します。この操作は取り消せません。"
          confirmLabel="退会する"
          destructive
          onConfirm={handleConfirm}
        />
      </CardContent>
    </Card>
  );
}
