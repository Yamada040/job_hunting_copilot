"use client";

import { useState } from "react";
import { CheckIcon, ClipboardDocumentIcon, SparklesIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { sanitizeMarkdown } from "./sanitize";

type Props = {
  title: string;
  description: string;
  /** 保存済みのAIの結果。まだ無ければ null */
  result: string | null;
  runLabel: string;
  onRun: () => void;
  pending: boolean;
  error: unknown;
  /** 1回だけ実行できる機能で、すでに結果がある場合は true（ボタンを出さない） */
  done?: boolean;
  /** 実行できない理由（未保存など）。あればボタンを押せなくして表示する */
  blockedReason?: string;
};

/**
 * AIの結果の表示と実行ボタン。AIへの入力はバックエンドが保存済みのデータから組み立てるので、
 * ここでは「実行する」操作と結果の表示だけを受け持つ（docs/backend-design.md 5章）。
 */
export function AiResultPanel({
  title,
  description,
  result,
  runLabel,
  onRun,
  pending,
  error,
  done,
  blockedReason,
}: Props) {
  const [copied, setCopied] = useState(false);
  const text = result ? sanitizeMarkdown(result) : null;

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <SparklesIcon className="h-5 w-5 text-sky-500" />
            {title}
          </h2>
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        {!done && (
          <div className="space-y-1">
            <Button type="button" variant="quest" onClick={onRun} disabled={pending || !!blockedReason}>
              {pending ? "AIが処理中です（数十秒かかることがあります）…" : runLabel}
            </Button>
            {blockedReason && <p className="text-xs text-muted-foreground">{blockedReason}</p>}
          </div>
        )}
        <ApiErrorMessage error={error} />

        {text && (
          <Card variant="muted" className="gap-2 px-4">
            <div className="flex justify-end">
              <Button type="button" variant="quest" size="xs" onClick={copy}>
                {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                {copied ? "コピー済み" : "コピー"}
              </Button>
            </div>
            <div className="whitespace-pre-line text-sm leading-6">{text}</div>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
