"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useAnswerWebtestQuestion, useDeleteWebtestQuestion, useWebtestQuestion } from "@/lib/api/webtests";
import { showFailureNotice, showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { FormSkeleton } from "@/app/_components/loading-skeletons";
import { ROUTES } from "@/lib/constants/routes";
import { LoadError } from "@/app/_components/load-error";

export function WebtestDetail({ id }: { id: string }) {
  const { data: question, error } = useWebtestQuestion(id);
  const answer = useAnswerWebtestQuestion(id);
  const deleteQuestion = useDeleteWebtestQuestion(id);
  const router = useRouter();
  const [status, setStatus] = useState<"correct" | "incorrect" | null>(null);

  if (error) return <LoadError error={error} back={{ href: ROUTES.WEBTESTS, label: "問題の一覧へ戻る" }} />;
  if (!question) return <FormSkeleton fields={4} />;
  const attempts = question.attempts.slice(0, 5);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const timeSpent = String(form.get("timeSpent") ?? "");
    setStatus(null);
    answer.mutate(
      { answer: String(form.get("answer") ?? ""), timeSpent: timeSpent ? Number(timeSpent) : undefined },
      {
        onSuccess: ({ attempt }) => setStatus(attempt.isCorrect ? "correct" : "incorrect"),
        onError: (e) => showFailureNotice("解答の送信", e),
      },
    );
  };

  const handleDelete = () => {
    deleteQuestion.mutate(undefined, {
      onSuccess: () => {
        showSuccessNotice("問題を削除しました");
        router.push(ROUTES.WEBTESTS);
      },
      onError: (e) => showFailureNotice("問題の削除", e),
    });
  };

  return (
    <>
      <h2 className="text-lg font-semibold">{question.title}</h2>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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

          {/* 解く前に答えが見えないよう、正解と解説は解答を送った後にだけ出す */}
          {status ? (
            <Card variant="muted" className="gap-2 p-4 text-sm">
              <p className={status === "correct" ? "font-semibold text-success" : "font-semibold text-destructive"}>
                {status === "correct" ? "正解です！" : "不正解です。解説を読んで、もう一度チャレンジしましょう。"}
              </p>
              <p>
                <span className="text-xs font-semibold text-muted-foreground">正解</span> {question.answer}
              </p>
              {question.explanation ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">解説</p>
                  <p className="whitespace-pre-line leading-6">{question.explanation}</p>
                </div>
              ) : null}
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
                  <span className={a.isCorrect ? "text-success" : "text-destructive"}>
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

      <ConfirmDialog
        title="問題を削除しますか？"
        description={`「${question.title}」と、その解答の記録を削除します。よろしいですか？`}
        confirmLabel="削除する"
        destructive
        onConfirm={handleDelete}
        trigger={
          <Button type="button" variant="destructive" disabled={deleteQuestion.isPending}>
            {deleteQuestion.isPending ? "削除中…" : "この問題を削除する"}
          </Button>
        }
      />
    </>
  );
}

const QuestionAttribute = ({ label, value }: { label: string; value: string }) => (
  <Badge variant="outline" className="text-[11px]">
    {label}: {value}
  </Badge>
);
