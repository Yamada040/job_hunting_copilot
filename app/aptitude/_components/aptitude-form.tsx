"use client";

import { useState } from "react";

import { useAptitudeResult, useDiagnoseAptitude, useSubmitAptitude, type AptitudeResult } from "@/lib/api/assessments";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { Answers } from "../types";
import { defaultAnswers, interestOptions, mbtiOptions, strengthOptions, valueOptions } from "./aptitude-constants";

export default function AptitudeForm() {
  const { data: result, error, isPending } = useAptitudeResult();

  if (error) return <ApiErrorMessage error={error} />;
  if (isPending) return <div className="dq-card p-6 text-sm text-white">読み込み中…</div>;
  return <AptitudeFormLoaded result={result} />;
}

function AptitudeFormLoaded({ result }: { result: AptitudeResult | null }) {
  const [answers, setAnswers] = useState<Answers>(result?.answers ?? defaultAnswers);
  const submit = useSubmitAptitude();
  const diagnose = useDiagnoseAptitude();
  // 回答は1人1回だけ。保存済みなら回答を表示するだけにする（docs/backend-design.md 3章）
  const locked = result !== null;

  const toggle = (key: keyof Pick<Answers, "interests" | "strengths" | "values">, value: string) => {
    if (locked) return;
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
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const saveAction = () => {
    if (!window.confirm("回答は1回だけ保存できます。この内容で保存しますか？")) return;
    submit.mutate(answers);
  };
  const saving = submit.isPending;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
      <div className="dq-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="theme-readable text-lg font-semibold">質問リスト</h2>
        </div>

        <div className="mt-4 space-y-4">
          <div className="dq-panel px-3 py-2 text-xs font-semibold text-yellow-200">※ 現在は一回しかできません。</div>
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

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="theme-readable text-sm font-semibold">{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="dq-panel flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-white transition hover:text-yellow-400"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
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

function SelectBox({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="theme-readable text-sm font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="dq-input text-sm">
        <option value="">{placeholder || "選択してください"}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
