"use client";

import Link from "next/link";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { ApiErrorMessage } from "./api-error-message";
import { EmptyState } from "./empty-state";

type Props = {
  error: unknown;
  /** 見つからなかったときに戻る先（一覧など）。詳細の画面で渡す */
  back?: { href: string; label: string };
};

/**
 * 画面のデータを読み込めなかったときの表示。エラーの文だけでは次に何をすればよいか分からないので、操作をあわせて出す。
 * 見つからない（削除された・他人のもの）ときは戻る先を、それ以外は読み込み直すボタンを出す。
 * ログインの期限切れ（401）は、Providers がログイン画面へ送るので、ここでは扱わない。
 */
export function LoadError({ error, back }: Props) {
  if (error instanceof ApiError && error.problem.status === 404) {
    return (
      <EmptyState title={error.problem.title} description="削除されたか、URLが間違っている可能性があります。">
        {back && (
          <Button asChild>
            <Link href={back.href}>{back.label}</Link>
          </Button>
        )}
      </EmptyState>
    );
  }
  return (
    <div className="space-y-3">
      <ApiErrorMessage error={error} />
      <Button type="button" variant="outline" onClick={() => window.location.reload()}>
        <ArrowPathIcon />
        読み込み直す
      </Button>
    </div>
  );
}
