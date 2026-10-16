"use client";

import { useState } from "react";
import { CheckIcon, ClipboardDocumentIcon, LinkIcon } from "@heroicons/react/24/outline";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { calendarFeedUrl, useCalendarFeed, useCreateCalendarFeed, useDeleteCalendarFeed } from "@/lib/api/calendar";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { showFailureNotice, showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { LinesSkeleton } from "@/app/_components/loading-skeletons";

const STEPS = [
  "パソコンで Googleカレンダーを開く",
  "左の「他のカレンダー」の「＋」から「URLで追加」を選ぶ",
  "下のURLを貼り付けて「カレンダーを追加」を押す",
];

/**
 * Googleカレンダーなどで、このアプリの予定とESの締切を見られるようにする購読用URL。
 * URLはハッシュでしか保存していないので、作ったその場でだけ表示し、あとで必要なら作り直してもらう。
 */
export function CalendarSubscription() {
  const { data: feed, error } = useCalendarFeed();
  const createFeed = useCreateCalendarFeed();
  const deleteFeed = useDeleteCalendarFeed();
  // 作ったときにだけ分かるURL。画面を離れると二度と表示できない
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = () =>
    createFeed.mutate(undefined, {
      onSuccess: ({ token }) => {
        setUrl(calendarFeedUrl(token));
        setCopied(false);
      },
      onError: (e) => showFailureNotice("購読用のURLの発行", e),
    });
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <Card className="gap-4 px-6 py-6">
      <CardHeader className="px-0">
        <CardTitle>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <LinkIcon className="h-5 w-5" aria-hidden />
            Googleカレンダーに表示する
          </h2>
        </CardTitle>
        <CardDescription>
          予定とESの締切を、Googleカレンダーなどで見られるようにします。アプリで変えた内容は、Googleカレンダー側に数時間〜1日ほど遅れて反映されます（Googleカレンダーからの変更はアプリに戻りません）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        {error ? (
          <ApiErrorMessage error={error} />
        ) : !feed ? (
          <LinesSkeleton lines={2} />
        ) : url ? (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="購読用のURL" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="outline" onClick={copy}>
                {copied ? <CheckIcon /> : <ClipboardDocumentIcon />}
                {copied ? "コピー済み" : "コピー"}
              </Button>
            </div>
            <Alert>
              <AlertDescription>
                このURLは、この画面を離れると二度と表示できません。URLを知っている人は予定を見られるので、人に教えないでください。
              </AlertDescription>
            </Alert>
          </>
        ) : feed.enabled ? (
          <p className="text-sm text-muted-foreground">
            購読用のURLは作成済みです
            {feed.createdAt && `（${new Date(feed.createdAt).toLocaleDateString()}）`}
            。URLをもう一度表示するには、作り直してください。
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {feed && !feed.enabled && (
            <Button type="button" onClick={create} disabled={createFeed.isPending}>
              {createFeed.isPending ? "作成中…" : "購読用のURLを作る"}
            </Button>
          )}
          {feed?.enabled && (
            <>
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="outline" disabled={createFeed.isPending}>
                    URLを作り直す
                  </Button>
                }
                title="URLを作り直しますか？"
                description="今のURLは使えなくなります。Googleカレンダーに登録してある場合は、新しいURLで登録し直してください。"
                confirmLabel="作り直す"
                onConfirm={create}
              />
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="destructive" disabled={deleteFeed.isPending}>
                    共有を止める
                  </Button>
                }
                title="共有を止めますか？"
                description="今のURLは使えなくなり、Googleカレンダーには新しい予定が届かなくなります。"
                confirmLabel="止める"
                destructive
                onConfirm={() =>
                  deleteFeed.mutate(undefined, {
                    onSuccess: () => {
                      setUrl(null);
                      showSuccessNotice("Googleカレンダーへの共有を止めました");
                    },
                    onError: (e) => showFailureNotice("共有の停止", e),
                  })
                }
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
