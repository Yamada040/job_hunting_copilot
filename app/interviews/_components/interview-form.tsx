"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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
    <Card className="p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <span className="text-sm font-medium">企業</span>
            <CompanyPicker value={company} onChange={setCompany} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-format">面接形式</Label>
            <NativeSelect
              id="interview-format"
              name="format"
              defaultValue={initial?.format ?? "online"}
              className="w-full"
            >
              {Object.entries(INTERVIEW_FORMAT_LABELS).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-round">面接の回次</Label>
            <Input
              id="interview-round"
              name="round"
              defaultValue={initial?.round ?? ""}
              required
              maxLength={50}
              placeholder="一次 / 二次 / 最終 など"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-date">実施日</Label>
            <Input
              id="interview-date"
              type="date"
              name="interviewDate"
              defaultValue={initial?.interviewDate ?? ""}
              required
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>聞かれた質問と自分の回答</span>
            <Button type="button" variant="quest" onClick={() => setQuestions((qs) => [...qs, emptyQuestion])}>
              質問を追加
            </Button>
          </div>
          {questions.map((q, index) => (
            <Card key={index} variant="muted" className="gap-2 px-4 py-3">
              <Input
                value={q.question}
                onChange={(e) => updateQuestion(index, { question: e.target.value })}
                maxLength={1000}
                placeholder={`質問 ${index + 1}`}
                className="bg-background"
              />
              <Textarea
                value={q.answer}
                onChange={(e) => updateQuestion(index, { answer: e.target.value })}
                maxLength={4000}
                rows={3}
                placeholder="自分の回答（要点）"
                className="bg-background"
              />
              <div className="flex items-center justify-between">
                <NativeSelect
                  size="sm"
                  value={q.rating ?? "average"}
                  onChange={(e) => updateQuestion(index, { rating: e.target.value as InterviewRating })}
                  className="bg-background text-xs"
                  aria-label="手応え"
                >
                  {Object.entries(INTERVIEW_RATING_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>
                      手応え：{label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="quest"
                    onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== index))}
                    className="text-xs text-destructive hover:text-destructive/80"
                  >
                    削除
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="interview-improvement">{FIELD_LABELS.improvement}</Label>
            <Textarea
              id="interview-improvement"
              name="improvement"
              defaultValue={initial?.improvement ?? ""}
              maxLength={2000}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-unexpected">{FIELD_LABELS.unexpected}</Label>
            <Textarea
              id="interview-unexpected"
              name="unexpected"
              defaultValue={initial?.unexpected ?? ""}
              maxLength={2000}
              rows={3}
            />
          </div>
        </div>

        <ApiErrorMessage error={error} labels={FIELD_LABELS} />

        <div>
          <Button type="submit" variant="quest" disabled={pending || !company}>
            {pending ? "保存中…" : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
