"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useEsEntries, type EsEntry } from "@/lib/api/es";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-full border px-3 py-1 ${
                tab === t.value ? "border-white bg-black text-white" : "border-white/40 bg-black/70 text-white/70"
              }`}
            >
              {t.label}
              {counts?.[t.value] !== undefined ? ` (${counts[t.value as keyof typeof counts]})` : ""}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="タイトル / 企業名 / タグで検索"
          className="w-full rounded-full border border-white/30 bg-black/70 px-4 py-2 text-xs text-white outline-none ring-0 placeholder:text-white/50 focus:border-yellow-400 sm:w-64"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((es) => (
          <Link
            key={es.id}
            href={`/es/${es.id}`}
            className="rounded-xl border border-[#3f3f46] bg-[#111111] px-4 py-4 text-white transition hover:-translate-y-0.5"
          >
            <p className="text-xs text-white/70">{es.company.name}</p>
            <p className="text-sm font-semibold">{es.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/70">
              <span className="rounded-full border border-white/40 bg-black/60 px-2 py-1 text-white">
                {STATUS_LABEL_MAP[es.status]}
              </span>
              {es.tags.length ? (
                es.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-yellow-300/40 bg-yellow-500/20 px-2 py-1 text-yellow-200"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-white/50">タグなし</span>
              )}
            </div>
            <p className="mt-1 text-xs text-white/60">
              締切: {es.deadline ?? "-"} ／ 更新日: {new Date(es.updatedAt).toLocaleDateString()}
            </p>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[#3f3f46] bg-[#111111] px-6 py-6 text-sm text-white/80">
            {isPending ? "読み込み中…" : "該当するESがありません。フィルタやキーワードを変えてみてください。"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
