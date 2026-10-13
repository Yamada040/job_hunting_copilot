"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWebtestQuestions, type WebtestQuestionSummary } from "@/lib/api/webtests";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState } from "@/app/_components/empty-state";
import { CardListSkeleton } from "@/app/_components/loading-skeletons";
import { ListCardLink, NoMatches, StaggerItem, StaggerList } from "@/app/_components/list/list-items";
import { FilterChips, ListToolbar } from "@/app/_components/list/list-toolbar";
import { useMediaQuery } from "@/app/_components/list/use-media-query";
import { LoadError } from "@/app/_components/load-error";

/** Webテストの問題の一覧。広い画面では属性を見比べられる表、狭い画面ではカードで出す。 */
export function WebtestList() {
  // テスト形式の絞り込みは、取り直さずに手元で行う（件数が少なく、見出しのアバターと同じキャッシュを使える）
  const { data, error, isPending } = useWebtestQuestions();
  const [testType, setTestType] = useState("all");
  const [query, setQuery] = useState("");
  const wide = useMediaQuery("(min-width: 768px)");

  const testTypes = useMemo(
    () => Array.from(new Set((data ?? []).map((q) => q.testType).filter((t): t is string => !!t))),
    [data],
  );
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (data ?? []).filter(
      (item) =>
        (testType === "all" || item.testType === testType) &&
        (!query || [item.title, item.category ?? ""].some((v) => v.toLowerCase().includes(q))),
    );
  }, [data, query, testType]);

  if (error) return <LoadError error={error} />;
  if (isPending) return <CardListSkeleton />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="まだ問題がありません"
        description="受ける予定のWebテストの問題を登録して、解答の練習ができます。"
      />
    );
  }

  return (
    <div className="space-y-4">
      <ListToolbar search={query} onSearchChange={setQuery} searchPlaceholder="タイトル・カテゴリで検索">
        <FilterChips
          label="テスト形式で絞り込む"
          value={testType}
          onChange={setTestType}
          options={[{ value: "all", label: "すべて" }, ...testTypes.map((t) => ({ value: t, label: t }))]}
        />
      </ListToolbar>

      {filtered.length === 0 ? (
        <NoMatches>該当する問題がありません。絞り込みやキーワードを変えてみてください。</NoMatches>
      ) : wide ? (
        <WebtestTable questions={filtered} />
      ) : (
        <StaggerList>
          {filtered.map((q, index) => (
            <StaggerItem key={q.id} index={index}>
              <ListCardLink href={ROUTES.WEBTEST_DETAIL(q.id)}>
                <p className="font-bold">{q.title}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {q.testType && <Badge variant="outline">{q.testType}</Badge>}
                  {q.category && <span>{q.category}</span>}
                  {q.difficulty && <span>難易度 {q.difficulty}</span>}
                  {q.timeLimit && <span>{q.timeLimit}秒</span>}
                </div>
              </ListCardLink>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}

function WebtestTable({ questions }: { questions: WebtestQuestionSummary[] }) {
  return (
    <Card className="py-0">
      <Table>
        <TableHeader className="bg-secondary/60">
          <TableRow>
            <TableHead className="px-4">タイトル</TableHead>
            <TableHead>テスト形式</TableHead>
            <TableHead>カテゴリ</TableHead>
            <TableHead>形式</TableHead>
            <TableHead>難易度</TableHead>
            <TableHead>時間(秒)</TableHead>
            <TableHead>作成日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((q) => (
            <TableRow key={q.id} className="transition-colors hover:bg-secondary/60">
              <TableCell className="px-4">
                <Link href={ROUTES.WEBTEST_DETAIL(q.id)} className="font-semibold text-primary hover:underline">
                  {q.title}
                </Link>
              </TableCell>
              <TableCell>{q.testType ?? "-"}</TableCell>
              <TableCell>{q.category ?? "-"}</TableCell>
              <TableCell>{q.format ?? "-"}</TableCell>
              <TableCell>{q.difficulty ?? "-"}</TableCell>
              <TableCell>{q.timeLimit ?? "-"}</TableCell>
              <TableCell>{new Date(q.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
