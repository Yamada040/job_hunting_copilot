"use client";

import { useId, useState } from "react";

import {
  useAnalyzeSelf,
  useSelfAnalysisResult,
  useSubmitSelfAnalysis,
  type SelfAnalysisAnswers,
  type SelfAnalysisResult,
} from "@/lib/api/assessments";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSkeleton } from "@/app/_components/loading-skeletons";
import { FormActions } from "@/app/_components/form/form-actions";
import { LeaveGuard } from "@/app/_components/form/leave-guard";
import { LoadError } from "@/app/_components/load-error";

type Answers = SelfAnalysisAnswers;

const defaultAnswers: Answers = {
  strengths: "",
  values: "",
  motivation: "",
  successes: "",
  failures: "",
  workStyle: "",
  future: "",
};

export default function SelfAnalysisForm() {
  const { data: result, error, isPending } = useSelfAnalysisResult();

  if (error) return <LoadError error={error} />;
  if (isPending) return <FormSkeleton />;
  return <SelfAnalysisFormLoaded result={result} />;
}

function SelfAnalysisFormLoaded({ result }: { result: SelfAnalysisResult | null }) {
  const [answers, setAnswers] = useState<Answers>(result?.answers ?? defaultAnswers);
  const submit = useSubmitSelfAnalysis();
  const analyze = useAnalyzeSelf();
  // 回答は1人1回だけ。保存済みなら回答を表示するだけにする（docs/backend-design.md 3章）
  const locked = result !== null;
  // 回答を変えたか。保存すると result が届いて locked になるので、そのときは確かめない
  const [touched, setTouched] = useState(false);
  const dirty = touched && !locked;
  const saving = submit.isPending;

  const handleChange = (key: keyof Answers, value: string) => {
    if (locked) return;
    setTouched(true);
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">質問リスト</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Card variant="muted" size="sm" className="px-3 text-xs font-semibold text-primary">
            ※ 現在は一回しかできません。
          </Card>
          <TextArea label="強み・得意なこと" value={answers.strengths} onChange={(v) => handleChange("strengths", v)} />
          <TextArea
            label="価値観（仕事選びで譲れないこと）"
            value={answers.values}
            onChange={(v) => handleChange("values", v)}
          />
          <TextArea
            label="モチベーション源泉（燃える瞬間 / 冷める瞬間）"
            value={answers.motivation}
            onChange={(v) => handleChange("motivation", v)}
          />
          <TextArea
            label="成功体験（役割・結果・工夫）"
            value={answers.successes}
            onChange={(v) => handleChange("successes", v)}
          />
          <TextArea label="失敗体験・学び" value={answers.failures} onChange={(v) => handleChange("failures", v)} />
          <TextArea
            label="働き方の好み（リモート/出社、チーム/個人、裁量など）"
            value={answers.workStyle}
            onChange={(v) => handleChange("workStyle", v)}
          />
          <TextArea
            label="将来像（3-5年の仮のゴール）"
            value={answers.future}
            onChange={(v) => handleChange("future", v)}
          />
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
        title="AI自己分析"
        description="保存した回答をもとに、強み・価値観・モチベーションの源泉と自己PRの骨子をAIがまとめます。1回だけ実行できます。"
        result={result?.aiResult ?? null}
        runLabel="AI自己分析を行う"
        onRun={() => analyze.mutate()}
        pending={analyze.isPending}
        error={analyze.error}
        done={!!result?.aiResult}
        blockedReason={locked ? undefined : "回答を保存すると実行できます"}
      />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
  );
}
