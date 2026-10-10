"use client";

import Link from "next/link";
import { useState } from "react";

import { useWebtestQuestions } from "@/lib/api/webtests";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

export function WebtestList() {
  const [testType, setTestType] = useState("");
  const { data, error, isPending } = useWebtestQuestions(testType);
  // 絞り込みの選択肢は、絞り込む前の一覧から作る
  const { data: all } = useWebtestQuestions();
  const items = data ?? [];
  const testTypeOptions = Array.from(new Set((all ?? []).map((q) => q.testType).filter((t): t is string => !!t)));

  if (error) return <ApiErrorMessage error={error} />;

  return (
    <div className="dq-card space-y-4 p-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="dq-panel flex items-center gap-2 px-3 py-2">
          <span className="text-xs text-white/60">テスト形式</span>
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            className="bg-transparent text-sm outline-none"
          >
            <option value="">すべて</option>
            {testTypeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm text-white">
          <thead className="bg-black/60">
            <tr>
              <Th>タイトル</Th>
              <Th>テスト形式</Th>
              <Th>カテゴリ</Th>
              <Th>形式</Th>
              <Th>難易度</Th>
              <Th>時間(秒)</Th>
              <Th>作成日</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-white/60">
                  {isPending ? "読み込み中…" : "まだ問題がありません。右上の「問題を追加」から登録してください。"}
                </td>
              </tr>
            ) : (
              items.map((q) => (
                <tr key={q.id} className="hover:bg-white/5">
                  <Td>
                    <Link href={ROUTES.WEBTEST_DETAIL(q.id)} className="font-semibold text-yellow-200 hover:underline">
                      {q.title}
                    </Link>
                  </Td>
                  <Td>{q.testType ?? "-"}</Td>
                  <Td>{q.category ?? "-"}</Td>
                  <Td>{q.format ?? "-"}</Td>
                  <Td>{q.difficulty ?? "-"}</Td>
                  <Td>{q.timeLimit ?? "-"}</Td>
                  <Td>{new Date(q.createdAt).toLocaleDateString()}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/70">{children}</th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="px-4 py-3 align-top text-white/90">{children}</td>
);
