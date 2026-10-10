"use client";

import type { EsQuestion } from "@/lib/api/es";

type Props = {
  questions: EsQuestion[];
  onChange: (questions: EsQuestion[]) => void;
};

// maxLength は backend/api/openapi.yaml の EsQuestion と同じ値
export function QuestionsEditor({ questions, onChange }: Props) {
  const update = (index: number, patch: Partial<EsQuestion>) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-white/70">
        <span>設問カード（必要に応じて追加できます）</span>
        <button
          type="button"
          onClick={() => onChange([...questions, { prompt: "", answer: "" }])}
          className="sidebar-link-style text-sm"
        >
          カードを追加
        </button>
      </div>

      {questions.map((q, index) => (
        <div key={index} className="rounded-xl border border-[#3f3f46] bg-[#111111] px-4 py-3">
          <label className="block space-y-1 text-xs text-white/70">
            設問
            <input
              value={q.prompt}
              onChange={(e) => update(index, { prompt: e.target.value })}
              maxLength={1000}
              className="dq-input text-sm"
              placeholder="例）学生時代に力を入れたこと"
            />
          </label>
          <label className="mt-2 block space-y-1 text-xs text-white/70">
            回答
            <textarea
              value={q.answer}
              onChange={(e) => update(index, { answer: e.target.value })}
              maxLength={4000}
              rows={5}
              className="dq-input text-sm"
              placeholder="回答を入力"
            />
            <span className="block text-right">{q.answer.length} 文字</span>
          </label>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(questions.filter((_, i) => i !== index))}
              className="sidebar-link-style text-xs"
            >
              削除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
