"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useEsEntries, type EsEntry } from "@/lib/api/es";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { EmptyState } from "@/app/_components/empty-state";
import { CardListSkeleton } from "@/app/_components/loading-skeletons";
import { ListCardLink, NoMatches, StaggerItem, StaggerList } from "@/app/_components/list/list-items";
import { FilterChips, ListToolbar } from "@/app/_components/list/list-toolbar";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";
import { daysFrom } from "@/app/dashboard/_components/menu-summaries";

type StatusFilter = "all" | EsEntry["status"];

const STATUS_LABEL_MAP: Record<EsEntry["status"], string> = {
  draft: "下書き",
  submitted: "提出済み",
};

// 下書きの締切がこの日数以内なら、急ぎとして目立たせる（ホームの「締切が近いES」と同じ）
const URGENT_DAYS = 3;

export function EsListClient() {
  const { data: items, error, isPending } = useEsEntries();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const today = formatDateKey(new Date());

  const { filtered, counts } = useMemo(() => {
    const q = query.toLowerCase();
    const matched = (items ?? []).filter(
      (item) => !query || [item.title, item.company.name, ...item.tags].some((v) => v.toLowerCase().includes(q)),
    );
    return {
      filtered: matched.filter((item) => status === "all" || item.status === status),
      counts: {
        all: matched.length,
        draft: matched.filter((i) => i.status === "draft").length,
        submitted: matched.filter((i) => i.status === "submitted").length,
      },
    };
  }, [items, query, status]);

  if (error) return <ApiErrorMessage error={error} />;
  if (isPending) return <CardListSkeleton className="xl:grid-cols-3" />;
  if (items.length === 0) {
    return (
      <EmptyState title="まだESがありません" description="企業を選んで、設問と回答を書くところから始めましょう。" />
    );
  }

  return (
    <div className="space-y-4">
      <ListToolbar search={query} onSearchChange={setQuery} searchPlaceholder="タイトル・企業名・タグで検索">
        <FilterChips
          label="状態で絞り込む"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "すべて", count: counts.all },
            { value: "draft", label: "下書き", count: counts.draft },
            { value: "submitted", label: "提出済み", count: counts.submitted },
          ]}
        />
      </ListToolbar>

      {filtered.length === 0 ? (
        <NoMatches>該当するESがありません。絞り込みやキーワードを変えてみてください。</NoMatches>
      ) : (
        <StaggerList className="sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((es, index) => (
            <StaggerItem key={es.id} index={index}>
              <ListCardLink href={ROUTES.ES_DETAIL(es.id)}>
                <p className="truncate text-xs text-muted-foreground">{es.company.name}</p>
                <p className="line-clamp-2 font-bold">{es.title}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={es.status === "submitted" ? "secondary" : "outline"}>
                    {STATUS_LABEL_MAP[es.status]}
                  </Badge>
                  {es.tags.map((tag) => (
                    <Badge key={tag} className="bg-accent text-accent-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Deadline entry={es} today={today} />
              </ListCardLink>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}

/** 締切。下書きで締切が近いものは赤く「あと○日」と出す。 */
function Deadline({ entry, today }: { entry: EsEntry; today: string }) {
  if (!entry.deadline) return <p className="mt-auto text-xs text-muted-foreground">締切なし</p>;
  const days = daysFrom(today, entry.deadline);
  const urgent = entry.status === "draft" && days >= 0 && days <= URGENT_DAYS;
  return (
    <p className={cn("mt-auto text-xs", urgent ? "font-bold text-destructive" : "text-muted-foreground")}>
      締切 {entry.deadline}
      {urgent && `（${days === 0 ? "今日" : `あと${days}日`}）`}
    </p>
  );
}
