"use client";

import { useState } from "react";

import { useAptitudeResult, useDiagnoseAptitude, useSubmitAptitude, type AptitudeResult } from "@/lib/api/assessments";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { noticeWhenDone, showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { ROUTES } from "@/lib/constants/routes";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Answers } from "../types";
import { defaultAnswers, QUESTIONS, type Question } from "./aptitude-constants";
import { CheckboxGroup, SelectBox, TextArea } from "./aptitude-fields";
import { FormSkeleton } from "@/app/_components/loading-skeletons";
import { LeaveGuard } from "@/app/_components/form/leave-guard";
import { LoadError } from "@/app/_components/load-error";
import { QuestionStepper } from "@/app/_components/form/question-stepper";

export default function AptitudeForm() {
  const { data: result, error, isPending } = useAptitudeResult();

  if (error) return <LoadError error={error} />;
  if (isPending) return <FormSkeleton />;
  return <AptitudeFormLoaded result={result} />;
}

function AptitudeFormLoaded({ result }: { result: AptitudeResult | null }) {
  const [answers, setAnswers] = useState<Answers>(result?.answers ?? defaultAnswers);
  const submit = useSubmitAptitude();
  const diagnose = useDiagnoseAptitude();
  // 回答は1人1回だけ。保存済みなら回答を表示するだけにする（docs/backend-design.md 3章）
  const locked = result !== null;
  // 回答を変えたか。保存すると result が届いて locked になるので、そのときは確かめない
  const [touched, setTouched] = useState(false);
  const dirty = touched && !locked;

  const toggle = (key: keyof Pick<Answers, "interests" | "strengths" | "values">, value: string) => {
    if (locked) return;
    setTouched(true);
    setAnswers((prev) => {
      const list = new Set(prev[key]);
      if (list.has(value)) {
        list.delete(value);
      } else {
        list.add(value);
      }
      return { ...prev, [key]: Array.from(list) };
    });
  };

  const handleChange = (key: keyof Answers, value: string) => {
    if (locked) return;
    setTouched(true);
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const saving = submit.isPending;

  const renderField = (q: Question, hideLabel: boolean) => {
    if (q.kind === "multi") {
      return (
        <CheckboxGroup
          label={q.title}
          hideLabel={hideLabel}
          options={q.options}
          selected={answers[q.key]}
          onToggle={(v) => toggle(q.key, v)}
        />
      );
    }
    if (q.kind === "select") {
      return (
        <SelectBox
          label={q.title}
          hideLabel={hideLabel}
          value={answers[q.key]}
          onChange={(v) => handleChange(q.key, v)}
          options={q.options}
          placeholder="選択してください"
        />
      );
    }
    return (
      <TextArea label={q.title} hideLabel={hideLabel} value={answers[q.key]} onChange={(v) => handleChange(q.key, v)} />
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">質問リスト</h2>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Card variant="muted" size="sm" className="px-3 text-xs font-semibold text-primary">
            ※ 現在は一回しかできません。
          </Card>
          {locked ? (
            // 答え終わったあとは、全部の答えを見返せるよう1つの画面に並べる
            QUESTIONS.map((q) => <div key={q.key}>{renderField(q, false)}</div>)
          ) : (
            <QuestionStepper
              dirty={dirty}
              steps={QUESTIONS.map((q) => ({
                key: q.key,
                title: q.title,
                hint: q.hint,
                answered: q.kind === "multi" ? answers[q.key].length > 0 : answers[q.key].trim() !== "",
                input: renderField(q, true),
              }))}
              submit={(unanswered) => (
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="default" disabled={saving}>
                      {saving ? "保存中..." : "保存する"}
                    </Button>
                  }
                  title="回答を保存しますか？"
                  description={`回答は1回だけ保存できます。${unanswered > 0 ? `まだ答えていない質問が${unanswered}問あります。` : ""}この内容で保存しますか？`}
                  confirmLabel="保存する"
                  onConfirm={() => submit.mutate(answers, { onSuccess: () => showSuccessNotice("回答を保存しました") })}
                />
              )}
            />
          )}
          <ApiErrorMessage error={submit.error} />
          <LeaveGuard when={dirty && !saving} />
        </CardContent>
      </Card>

      <AiResultPanel
        title="AI適性診断"
        description="保存した回答をもとに、向いている業界・職種をAIが診断します。1回だけ実行できます。"
        result={result?.aiResult ?? null}
        runLabel="AI適性診断を行う"
        onRun={() =>
          void noticeWhenDone(diagnose.mutateAsync(), {
            action: "AI適性診断",
            done: "AI適性診断が終わりました",
            link: { href: ROUTES.APTITUDE, label: "結果を見る" },
          })
        }
        pending={diagnose.isPending}
        done={!!result?.aiResult}
        blockedReason={locked ? undefined : "回答を保存すると実行できます"}
      />
    </div>
  );
}
