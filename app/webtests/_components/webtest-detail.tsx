"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useAnswerWebtestQuestion, useWebtestQuestion } from "@/lib/api/webtests";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

export function WebtestDetail({ id }: { id: string }) {
  const { data: question, error } = useWebtestQuestion(id);
  const answer = useAnswerWebtestQuestion(id);
  const [status, setStatus] = useState<"correct" | "incorrect" | null>(null);

  if (error) return <ApiErrorMessage error={error} />;
  if (!question) return <Card className="p-6 text-sm">読み込み中…</Card>;
  const attempts = question.attempts.slice(0, 5);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const timeSpent = String(form.get("timeSpent") ?? "");
    setStatus(null);
    answer.mutate(
      { answer: String(form.get("answer") ?? ""), timeSpent: timeSpent ? Number(timeSpent) : undefined },
      { onSuccess: ({ attempt }) => setStatus(attempt.isCorrect ? "correct" : "incorrect") },
    );
  };

  return (
    <>
      <h2 className="text-lg font-semibold">{question.title}</h2>
      {status === "correct" ? (
        <Card variant="muted" className="px-4 py-3 text-sm text-emerald-600">
          正解です！
        </Card>
      ) : status === "incorrect" ? (
        <Card variant="muted" className="px-4 py-3 text-sm text-destructive">
          不正解です。もう一度チャレンジしましょう。
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="gap-4 p-6">
          <div className="flex flex-wrap gap-2">
            <QuestionAttribute label="テスト形式" value={question.testType ?? "未設定"} />
            <QuestionAttribute label="カテゴリ" value={question.category ?? "未設定"} />
            <QuestionAttribute label="形式" value={question.format ?? "未設定"} />
            <QuestionAttribute label="難易度" value={question.difficulty ?? "未設定"} />
            <QuestionAttribute label="制限" value={question.timeLimit ? `${question.timeLimit}s` : "任意"} />
          </div>
          <p className="whitespace-pre-line text-sm leading-6">{question.body}</p>

          <Card variant="muted" className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="webtest-answer" className="font-semibold">
                  解答
                </Label>
                {question.choices.length > 0 ? (
                  <NativeSelect id="webtest-answer" name="answer" required className="w-full bg-background">
                    <NativeSelectOption value="">選択してください</NativeSelectOption>
                    {question.choices.map((c, idx) => (
                      <NativeSelectOption key={`${idx}-${c}`} value={c}>
                        {c}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    id="webtest-answer"
                    name="answer"
                    required
                    maxLength={500}
                    placeholder="解答を入力"
                    className="bg-background"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="webtest-time-spent" className="text-xs text-muted-foreground">
                  解答時間（秒） 任意
                </Label>
                <Input
                  id="webtest-time-spent"
                  type="number"
                  name="timeSpent"
                  min={0}
                  max={36000}
                  placeholder="60"
                  className="bg-background"
                />
              </div>
              <div className="flex justify-start pt-2">
                <Button type="submit" variant="default" disabled={answer.isPending}>
                  {answer.isPending ? "送信中…" : "解答を送信"}
                </Button>
              </div>
            </form>
          </Card>

          <ApiErrorMessage error={answer.error} />

          {question.explanation ? (
            <Card variant="muted" className="gap-1 p-4 text-sm">
              <p className="text-xs font-semibold text-muted-foreground">解説</p>
              <p className="whitespace-pre-line leading-6">{question.explanation}</p>
            </Card>
          ) : null}
        </Card>

        <Card className="gap-3 p-4">
          <p className="text-sm font-semibold">最近の解答 (5件)</p>
          <div className="space-y-2 text-xs">
            {attempts.length === 0 ? (
              <p className="text-muted-foreground">まだ解答履歴がありません。</p>
            ) : (
              attempts.map((a) => (
                <Card key={a.id} variant="muted" className="flex-row items-center justify-between px-3 py-2">
                  <span className={a.isCorrect ? "text-emerald-600" : "text-destructive"}>
                    {a.isCorrect ? "正解" : "不正解"}
                  </span>
                  <span className="text-muted-foreground">
                    {a.timeSpent ? `${a.timeSpent}s` : "-"} / {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

const QuestionAttribute = ({ label, value }: { label: string; value: string }) => (
  <Badge variant="outline" className="text-[11px]">
    {label}: {value}
  </Badge>
);
