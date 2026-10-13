"use client";

import { useState } from "react";

import { useAptitudeResult, useDiagnoseAptitude, useSubmitAptitude, type AptitudeResult } from "@/lib/api/assessments";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Answers } from "../types";
import { defaultAnswers, interestOptions, mbtiOptions, strengthOptions, valueOptions } from "./aptitude-constants";
import { CheckboxGroup, SelectBox, TextArea } from "./aptitude-fields";
import { FormSkeleton } from "@/app/_components/loading-skeletons";
import { FormActions } from "@/app/_components/form/form-actions";
import { LeaveGuard } from "@/app/_components/form/leave-guard";
import { LoadError } from "@/app/_components/load-error";

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
          <CheckboxGroup
            label="興味のある領域（複数選択可）"
            options={interestOptions}
            selected={answers.interests}
            onToggle={(v) => toggle("interests", v)}
          />
          <CheckboxGroup
            label="強み（複数選択可）"
            options={strengthOptions}
            selected={answers.strengths}
            onToggle={(v) => toggle("strengths", v)}
          />
          <CheckboxGroup
            label="価値観（複数選択可）"
            options={valueOptions}
            selected={answers.values}
            onToggle={(v) => toggle("values", v)}
          />
          <TextArea
            label="好きな業務/没頭できること"
            value={answers.enjoy}
            onChange={(v) => handleChange("enjoy", v)}
          />
          <TextArea
            label="誇りに思う達成"
            value={answers.achievements}
            onChange={(v) => handleChange("achievements", v)}
          />
          <TextArea label="苦手・避けたいこと" value={answers.dislike} onChange={(v) => handleChange("dislike", v)} />
          <TextArea
            label="働き方の希望（例: リモート中心、出社多め）"
            value={answers.workStyle}
            onChange={(v) => handleChange("workStyle", v)}
          />
          <TextArea label="希望勤務地/働き方" value={answers.location} onChange={(v) => handleChange("location", v)} />
          <TextArea
            label="興味のある業界"
            value={answers.industryWish}
            onChange={(v) => handleChange("industryWish", v)}
          />
          <TextArea label="興味のある職種" value={answers.roleWish} onChange={(v) => handleChange("roleWish", v)} />
          <SelectBox
            label="MBTIタイプ（任意）"
            value={answers.mbti}
            onChange={(v) => handleChange("mbti", v)}
            options={mbtiOptions}
            placeholder="選択してください"
          />
          <TextArea label="補足メモ" value={answers.otherNotes} onChange={(v) => handleChange("otherNotes", v)} />
          <FormActions dirty={dirty} shortcut={false}>
            <ConfirmDialog
              trigger={
                <Button type="button" variant="default" disabled={saving || locked}>
                  {locked ? "実施済み" : saving ? "保存中..." : "保存する"}
                </Button>
              }
              title="回答を保存しますか？"
              description="回答は1回だけ保存できます。この内容で保存しますか？"
              confirmLabel="保存する"
              onConfirm={() => submit.mutate(answers)}
            />
          </FormActions>
          <ApiErrorMessage error={submit.error} />
          <LeaveGuard when={dirty && !saving} />
        </CardContent>
      </Card>

      <AiResultPanel
        title="AI適性診断"
        description="保存した回答をもとに、向いている業界・職種をAIが診断します。1回だけ実行できます。"
        result={result?.aiResult ?? null}
        runLabel="AI適性診断を行う"
        onRun={() => diagnose.mutate()}
        pending={diagnose.isPending}
        error={diagnose.error}
        done={!!result?.aiResult}
        blockedReason={locked ? undefined : "回答を保存すると実行できます"}
      />
    </div>
  );
}
