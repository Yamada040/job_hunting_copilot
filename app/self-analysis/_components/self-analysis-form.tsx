"use client";

import { useState } from "react";

import {
  useAnalyzeSelf,
  useSelfAnalysisResult,
  useSubmitSelfAnalysis,
  type SelfAnalysisAnswers,
  type SelfAnalysisResult,
} from "@/lib/api/assessments";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";

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

  if (error) return <ApiErrorMessage error={error} />;
  if (isPending) return <div className="dq-card p-6 text-sm text-white">読み込み中…</div>;
  return <SelfAnalysisFormLoaded result={result} />;
}

function SelfAnalysisFormLoaded({ result }: { result: SelfAnalysisResult | null }) {
  const [answers, setAnswers] = useState<Answers>(result?.answers ?? defaultAnswers);
  const submit = useSubmitSelfAnalysis();
  const analyze = useAnalyzeSelf();
  // 回答は1人1回だけ。保存済みなら回答を表示するだけにする（docs/backend-design.md 3章）
  const locked = result !== null;
  const saving = submit.isPending;

  const saveAction = () => {
    if (!window.confirm("回答は1回だけ保存できます。この内容で保存しますか？")) return;
    submit.mutate(answers);
  };

  const handleChange = (key: keyof Answers, value: string) => {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
      <div className="dq-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="theme-readable text-lg font-semibold">質問リスト</h2>
        </div>
        <div className="mt-4 space-y-3">
          <div className="dq-panel px-3 py-2 text-xs font-semibold text-yellow-200">※ 現在は一回しかできません。</div>
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
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveAction}
              disabled={saving || locked}
              className="dq-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locked ? "実施済み" : saving ? "保存中..." : "保存する"}
            </button>
          </div>
          <ApiErrorMessage error={submit.error} />
        </div>
      </div>

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
  return (
    <label className="block space-y-2">
      <span className="theme-readable text-sm font-medium">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="dq-input text-sm" />
    </label>
  );
}
