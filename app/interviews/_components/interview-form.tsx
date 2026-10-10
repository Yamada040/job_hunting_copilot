"use client";

import { useState } from "react";

import type { CompanySummary } from "@/lib/api/companies";
import type { InterviewFormat, InterviewLog, InterviewQuestion, InterviewRating } from "@/lib/api/interviews";
import { INTERVIEW_FORMAT_LABELS, INTERVIEW_RATING_LABELS } from "@/lib/interviews/labels";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { CompanyPicker } from "@/app/_components/company-picker";

export type InterviewFormValues = {
  companyId: string;
  format: InterviewFormat;
  round: string;
  interviewDate: string;
  questions: InterviewQuestion[];
  improvement: string;
  unexpected: string;
};

const FIELD_LABELS: Record<string, string> = {
  companyId: "企業",
  format: "面接形式",
  round: "面接の回次",
  interviewDate: "実施日",
  questions: "質問と回答",
  improvement: "次回改善したい点",
  unexpected: "想定外だった質問・論点",
};

const emptyQuestion: InterviewQuestion = { question: "", answer: "", rating: "average" };

type Props = {
  initial?: InterviewLog;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: InterviewFormValues) => void;
};

export function InterviewForm({ initial, submitLabel, pending, error, onSubmit }: Props) {
  const [company, setCompany] = useState<CompanySummary | null>(initial?.company ?? null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>(initial?.questions ?? [emptyQuestion]);

  const updateQuestion = (index: number, patch: Partial<InterviewQuestion>) =>
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    onSubmit({
      companyId: company?.id ?? "",
      format: text("format") as InterviewFormat,
      round: text("round"),
      interviewDate: text("interviewDate"),
      questions,
      improvement: text("improvement"),
      unexpected: text("unexpected"),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="dq-card space-y-6 p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <span className="text-sm font-medium text-white">企業</span>
          <CompanyPicker value={company} onChange={setCompany} />
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">面接形式</span>
          <select name="format" defaultValue={initial?.format ?? "online"} className="dq-input text-sm">
            {Object.entries(INTERVIEW_FORMAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">面接の回次</span>
          <input
            name="round"
            defaultValue={initial?.round ?? ""}
            required
            maxLength={50}
            placeholder="一次 / 二次 / 最終 など"
            className="dq-input text-sm"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">実施日</span>
          <input
            type="date"
            name="interviewDate"
            defaultValue={initial?.interviewDate ?? ""}
            required
            className="dq-input text-sm"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-white/70">
          <span>聞かれた質問と自分の回答</span>
          <button
            type="button"
            onClick={() => setQuestions((qs) => [...qs, emptyQuestion])}
            className="sidebar-link-style text-sm"
          >
            質問を追加
          </button>
        </div>
        {questions.map((q, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-[#3f3f46] bg-[#111111] px-4 py-3">
            <input
              value={q.question}
              onChange={(e) => updateQuestion(index, { question: e.target.value })}
              maxLength={1000}
              placeholder={`質問 ${index + 1}`}
              className="dq-input text-sm"
            />
            <textarea
              value={q.answer}
              onChange={(e) => updateQuestion(index, { answer: e.target.value })}
              maxLength={4000}
              rows={3}
              placeholder="自分の回答（要点）"
              className="dq-input text-sm"
            />
            <div className="flex items-center justify-between">
              <select
                value={q.rating ?? "average"}
                onChange={(e) => updateQuestion(index, { rating: e.target.value as InterviewRating })}
                className="dq-input w-auto text-xs"
                aria-label="手応え"
              >
                {Object.entries(INTERVIEW_RATING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    手応え：{label}
                  </option>
                ))}
              </select>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== index))}
                  className="sidebar-link-style text-xs"
                >
                  削除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">{FIELD_LABELS.improvement}</span>
          <textarea
            name="improvement"
            defaultValue={initial?.improvement ?? ""}
            maxLength={2000}
            rows={3}
            className="dq-input text-sm"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">{FIELD_LABELS.unexpected}</span>
          <textarea
            name="unexpected"
            defaultValue={initial?.unexpected ?? ""}
            maxLength={2000}
            rows={3}
            className="dq-input text-sm"
          />
        </label>
      </div>

      <ApiErrorMessage error={error} labels={FIELD_LABELS} />

      <button type="submit" className="dq-button" disabled={pending || !company}>
        {pending ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
