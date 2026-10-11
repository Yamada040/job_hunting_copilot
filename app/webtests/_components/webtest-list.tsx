"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWebtestQuestions } from "@/lib/api/webtests";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { EmptyState } from "@/app/_components/empty-state";

export function WebtestList() {
  const [testType, setTestType] = useState("");
  const { data, error, isPending } = useWebtestQuestions(testType);
  // 絞り込みの選択肢は、絞り込む前の一覧から作る
  const { data: all } = useWebtestQuestions();
  const items = data ?? [];
  const testTypeOptions = Array.from(new Set((all ?? []).map((q) => q.testType).filter((t): t is string => !!t)));

  if (error) return <ApiErrorMessage error={error} />;
  if (all?.length === 0) {
    return (
      <EmptyState
        title="まだ問題がありません"
        description="受ける予定のWebテストの問題を登録して、解答の練習ができます。"
      >
        <Button asChild variant="quest">
          <Link href={ROUTES.WEBTESTS_NEW}>問題を追加する</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <Card className="gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Label htmlFor="webtest-test-type-filter" className="text-xs text-muted-foreground">
          テスト形式
        </Label>
        <NativeSelect id="webtest-test-type-filter" value={testType} onChange={(e) => setTestType(e.target.value)}>
          <NativeSelectOption value="">すべて</NativeSelectOption>
          {testTypeOptions.map((opt) => (
            <NativeSelectOption key={opt} value={opt}>
              {opt}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Table>
        <TableHeader className="bg-secondary/60">
          <TableRow>
            <TableHead>タイトル</TableHead>
            <TableHead>テスト形式</TableHead>
            <TableHead>カテゴリ</TableHead>
            <TableHead>形式</TableHead>
            <TableHead>難易度</TableHead>
            <TableHead>時間(秒)</TableHead>
            <TableHead>作成日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-4 text-center text-muted-foreground">
                {isPending ? "読み込み中…" : "この形式の問題はありません。"}
              </TableCell>
            </TableRow>
          ) : (
            items.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <Link
                    href={ROUTES.WEBTEST_DETAIL(q.id)}
                    className="font-semibold text-primary hover:text-sky-500 hover:underline"
                  >
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
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
