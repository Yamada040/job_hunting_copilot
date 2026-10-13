"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useInterviewLogs } from "@/lib/api/interviews";
import { ROUTES } from "@/lib/constants/routes";
import { INTERVIEW_FORMAT_LABELS } from "@/lib/interviews/labels";
import { EmptyState } from "@/app/_components/empty-state";
import { CardListSkeleton } from "@/app/_components/loading-skeletons";
import { ListCardLink, NoMatches, StaggerItem, StaggerList } from "@/app/_components/list/list-items";
import { FilterChips, ListToolbar } from "@/app/_components/list/list-toolbar";
import { LoadError } from "@/app/_components/load-error";

type ReviewFilter = "all" | "unreviewed" | "reviewed";

export function InterviewList() {
  const { data: logs, error, isPending } = useInterviewLogs();
  const [review, setReview] = useState<ReviewFilter>("all");
  const [query, setQuery] = useState("");

  const { filtered, counts } = useMemo(() => {
    const q = query.toLowerCase();
    const matched = (logs ?? []).filter(
      (log) => !query || [log.company.name, log.round ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
    const unreviewed = matched.filter((log) => log.aiResult === null);
    return {
      filtered:
        review === "all"
          ? matched
          : review === "unreviewed"
            ? unreviewed
            : matched.filter((log) => log.aiResult !== null),
      counts: { all: matched.length, unreviewed: unreviewed.length, reviewed: matched.length - unreviewed.length },
    };
  }, [logs, query, review]);

  if (error) return <LoadError error={error} />;
  if (isPending) return <CardListSkeleton className="xl:grid-cols-3" />;
  if (logs.length === 0) {
    return (
      <EmptyState
        title="まだ面接ログがありません"
        description="面接で聞かれた質問と答えを記録して、次の面接に活かしましょう。"
      />
    );
  }

  return (
    <div className="space-y-4">
      <ListToolbar search={query} onSearchChange={setQuery} searchPlaceholder="企業名・回次で検索">
        <FilterChips
          label="振り返りで絞り込む"
          value={review}
          onChange={setReview}
          options={[
            { value: "all", label: "すべて", count: counts.all },
            { value: "unreviewed", label: "振り返り待ち", count: counts.unreviewed },
            { value: "reviewed", label: "振り返り済み", count: counts.reviewed },
          ]}
        />
      </ListToolbar>

      {filtered.length === 0 ? (
        <NoMatches>該当する面接ログがありません。絞り込みやキーワードを変えてみてください。</NoMatches>
      ) : (
        <StaggerList className="sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((log, index) => (
            <StaggerItem key={log.id} index={index}>
              <ListCardLink href={ROUTES.INTERVIEW_DETAIL(log.id)}>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{log.round ?? "回次未設定"}</Badge>
                  <span className="text-xs text-muted-foreground">{log.interviewDate ?? "日付未設定"}</span>
                </div>
                <p className="truncate font-bold">{log.company.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{log.format ? INTERVIEW_FORMAT_LABELS[log.format] : "面接形式未設定"}</span>
                  {log.aiResult ? (
                    <Badge className="bg-success/10 text-success">振り返り済み</Badge>
                  ) : (
                    <Badge variant="outline">振り返り待ち</Badge>
                  )}
                </div>
                <p className="mt-auto truncate text-xs text-muted-foreground">
                  {log.improvement ?? "改善点は未入力です"}
                </p>
              </ListCardLink>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
