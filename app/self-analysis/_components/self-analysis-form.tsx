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
import { showFailureNotice } from "@/app/_components/avatar/avatar-notice-store";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSkeleton } from "@/app/_components/loading-skeletons";
import { LeaveGuard } from "@/app/_components/form/leave-guard";
import { LoadError } from "@/app/_components/load-error";
import { QuestionStepper } from "@/app/_components/form/question-stepper";

type Answers = SelfAnalysisAnswers;

// 質問と、書き出しに迷わないためのヒント
const QUESTIONS: { key: keyof Answers; title: string; hint: string }[] = [
  { key: "strengths", title: "強み・得意なこと", hint: "例：粘り強く続けられる。人の話を聞いてまとめるのが得意。" },
  {
    key: "values",
    title: "価値観（仕事選びで譲れないこと）",
    hint: "例：成長できる環境、人の役に立っている実感、安定。",
  },
  {
    key: "motivation",
    title: "モチベーションの源泉（燃える瞬間・冷める瞬間）",
    hint: "どんなときにやる気が出て、どんなときに下がるかを書いてみましょう。",
  },
  {
    key: "successes",
    title: "成功体験（役割・結果・工夫）",
    hint: "自分の役割、出した結果、そのための工夫の3つを書くとまとまります。",
  },
  {
    key: "failures",
    title: "失敗体験と学び",
    hint: "失敗そのものより、そこから何を学び、次にどう活かしたかが大事です。",
  },
  { key: "workStyle", title: "働き方の好み", hint: "リモートか出社か、チームか個人か、裁量の大きさなど。" },
  {
    key: "future",
    title: "将来像（3〜5年後の仮のゴール）",
    hint: "仮で大丈夫です。どんな仕事をして、どうなっていたいか。",
  },
];

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
          {locked ? (
            // 答え終わったあとは、全部の答えを見返せるよう1つの画面に並べる
            QUESTIONS.map((q) => (
              <TextArea key={q.key} label={q.title} value={answers[q.key]} onChange={(v) => handleChange(q.key, v)} />
            ))
          ) : (
            <QuestionStepper
              dirty={dirty}
              steps={QUESTIONS.map((q) => ({
                key: q.key,
                title: q.title,
                hint: q.hint,
                answered: answers[q.key].trim() !== "",
                input: (
                  <Textarea
                    aria-label={q.title}
                    value={answers[q.key]}
                    onChange={(e) => handleChange(q.key, e.target.value)}
                    rows={6}
                    className="min-h-40 text-base"
                  />
                ),
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
                  onConfirm={() => submit.mutate(answers)}
                />
              )}
            />
          )}
          <ApiErrorMessage error={submit.error} />
          <LeaveGuard when={dirty && !saving} />
        </CardContent>
      </Card>

      <AiResultPanel
        title="AI自己分析"
        description="保存した回答をもとに、強み・価値観・モチベーションの源泉と自己PRの骨子をAIがまとめます。1回だけ実行できます。"
        result={result?.aiResult ?? null}
        runLabel="AI自己分析を行う"
        onRun={() => analyze.mutate(undefined, { onError: (e) => showFailureNotice("AI自己分析", e) })}
        pending={analyze.isPending}
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
