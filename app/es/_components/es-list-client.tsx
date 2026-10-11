"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEsEntries, type EsEntry } from "@/lib/api/es";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { EmptyState } from "@/app/_components/empty-state";

const TABS = [
  { label: "すべて", value: "all" },
  { label: "下書き", value: "draft" },
  { label: "提出済み", value: "submitted" },
] as const;

const STATUS_LABEL_MAP: Record<EsEntry["status"], string> = {
  draft: "下書き",
  submitted: "提出済み",
};

export function EsListClient() {
  const { data: items, error, isPending } = useEsEntries();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
  const [query, setQuery] = useState("");

  const { filtered, counts } = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = (items ?? []).filter(
      (item) => !query || [item.title, item.company.name, ...item.tags].some((v) => v.toLowerCase().includes(q)),
    );
    const byTab = filtered.filter((item) => (tab === "all" ? true : item.status === tab));
    return {
      filtered: byTab,
      counts: {
        all: filtered.length,
        draft: filtered.filter((i) => i.status === "draft").length,
        submitted: filtered.filter((i) => i.status === "submitted").length,
      },
    };
  }, [items, query, tab]);

  if (error) return <ApiErrorMessage error={error} />;
  if (items?.length === 0) {
    return (
      <EmptyState title="まだESがありません" description="企業を選んで、設問と回答を書くところから始めましょう。">
        <Button asChild variant="quest">
          <Link href={ROUTES.ES_NEW}>ESを作成する</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button
              key={t.value}
              type="button"
              size="xs"
              variant={tab === t.value ? "default" : "outline"}
              onClick={() => setTab(t.value)}
              className="rounded-full px-3"
            >
              {t.label}
              {counts?.[t.value] !== undefined ? ` (${counts[t.value as keyof typeof counts]})` : ""}
            </Button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="タイトル / 企業名 / タグで検索"
          className="w-full rounded-full bg-card px-4 text-xs sm:w-64"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((es) => (
          <Link
            key={es.id}
            href={`/es/${es.id}`}
            className="rounded-xl bg-card px-4 py-4 text-card-foreground shadow-window ring-1 ring-border transition hover:-translate-y-0.5"
          >
            <p className="text-xs text-muted-foreground">{es.company.name}</p>
            <p className="text-sm font-semibold">{es.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline">{STATUS_LABEL_MAP[es.status]}</Badge>
              {es.tags.length ? (
                es.tags.map((tag) => (
                  <Badge key={tag} className="bg-sky-100 text-sky-700">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span>タグなし</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              締切: {es.deadline ?? "-"} ／ 更新日: {new Date(es.updatedAt).toLocaleDateString()}
            </p>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <Card className="px-6 text-sm">
            {isPending ? "読み込み中…" : "該当するESがありません。フィルタやキーワードを変えてみてください。"}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
