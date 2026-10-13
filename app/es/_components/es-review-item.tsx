"use client";

import { useState } from "react";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

import type { EsReviewItem, EsReviewScore } from "@/lib/api/es";
import { countCharacters, rewriteRange } from "@/lib/es/characters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const scoreLabels = [
  ["structure", "構成"],
  ["specificity", "具体性"],
  ["companyFit", "企業との一致"],
] as const;

/** 設問または本文1つ分の添削結果。 */
export function EsReviewItemCard({ item }: { item: EsReviewItem }) {
  return (
    <Card variant="muted" className="gap-3 px-4 py-4">
      <h3 className="text-sm font-semibold">{item.source === "body" ? "本文" : item.prompt}</h3>

      <ul className="space-y-1">
        {scoreLabels.map(([key, label]) => (
          <ScoreRow key={key} label={label} score={item[key]} />
        ))}
      </ul>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">改善点</p>
        <p className="whitespace-pre-line text-sm leading-6">{item.improvement}</p>
      </div>

      <Rewrite text={item.rewrite} charLimit={item.charLimit} />
    </Card>
  );
}

function ScoreRow({ label, score }: { label: string; score: EsReviewScore }) {
  return (
    <li className="flex gap-3 text-sm">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="w-12 shrink-0 font-semibold text-primary">{score.score ?? "—"}</span>
      <span className="text-xs leading-5 text-muted-foreground">{score.comment}</span>
    </li>
  );
}

/** 修正版と、その文字数。上限があれば、目標の範囲（上限の9割〜上限）を外れたときに赤くする。 */
function Rewrite({ text, charLimit }: { text: string; charLimit: number | null }) {
  const [copied, setCopied] = useState(false);
  const count = countCharacters(text);
  const range = charLimit === null ? null : rewriteRange(charLimit);
  const outOfRange = range !== null && (count < range.min || count > range.max);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">修正版</p>
        <Button type="button" variant="ghost" size="xs" onClick={copy}>
          {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
          {copied ? "コピー済み" : "コピー"}
        </Button>
      </div>
      <p className="whitespace-pre-line rounded-lg bg-card px-3 py-2 text-sm leading-6">{text}</p>
      <p
        className={cn("text-right text-xs text-muted-foreground", {
          "font-semibold text-destructive": outOfRange,
        })}
      >
        {count} 文字
        {range && `（目標 ${range.min}〜${range.max} 文字${outOfRange ? "・範囲外" : ""}）`}
      </p>
    </div>
  );
}
