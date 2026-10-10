"use client";

import { useState } from "react";

import type { CompanySummary } from "@/lib/api/companies";
import type { EsEntry, EsQuestion } from "@/lib/api/es";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { CompanyPicker } from "@/app/_components/company-picker";
import { QuestionsEditor } from "./questions-editor";

export type EsFormValues = {
  companyId: string;
  title: string;
  position: string;
  deadline: string | null;
  memo: string;
  tags: string[];
  questions: EsQuestion[];
  contentMd: string;
};

export const ES_FIELD_LABELS: Record<string, string> = {
  companyId: "企業",
  title: "タイトル",
  position: "職種・募集枠",
  deadline: "締切日",
  memo: "メモ",
  tags: "タグ",
  questions: "設問",
  contentMd: "本文",
};

type Props = {
  initial?: EsEntry;
  pending: boolean;
  error: unknown;
  /** submit が true なら、保存したうえで提出する */
  onSubmit: (values: EsFormValues, submit: boolean) => void;
  /** 提出済みのESでは「提出する」を出さない */
  canSubmit: boolean;
  /** 新規作成のときに最初から並べておく設問 */
  defaultQuestions?: EsQuestion[];
};

export function EsForm({ initial, pending, error, onSubmit, canSubmit, defaultQuestions = [] }: Props) {
  const [company, setCompany] = useState<CompanySummary | null>(initial?.company ?? null);
  const [questions, setQuestions] = useState<EsQuestion[]>(initial?.questions ?? defaultQuestions);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const submit = submitter?.value === "submit";
    if (submit && !window.confirm("提出すると下書きに戻せません。提出しますか？")) return;
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    onSubmit(
      {
        companyId: company?.id ?? "",
        title: text("title"),
        position: text("position"),
        deadline: text("deadline") || null,
        memo: text("memo"),
        tags: text("tags")
          .split(/[,、]/)
          .map((t) => t.trim())
          .filter(Boolean),
        questions,
        contentMd: text("contentMd"),
      },
      submit,
    );
  };

  return (
    <form onSubmit={handleSubmit} className="dq-card space-y-6 p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <span className="text-sm font-medium text-white">企業</span>
          <CompanyPicker value={company} onChange={setCompany} />
        </div>
        <Field
          label="タイトル"
          name="title"
          defaultValue={initial?.title}
          maxLength={100}
          required
          placeholder="例）本選考ES"
        />
        <Field
          label="職種・募集枠"
          name="position"
          defaultValue={initial?.position}
          maxLength={100}
          placeholder="例）エンジニア職"
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">締切日</span>
          <input type="date" name="deadline" defaultValue={initial?.deadline ?? ""} className="dq-input text-sm" />
        </label>
        <Field
          label="タグ（カンマ区切り）"
          name="tags"
          defaultValue={initial?.tags.join(", ")}
          placeholder="例）IT, 第一志望"
        />
        <Field label="メモ" name="memo" defaultValue={initial?.memo} maxLength={2000} placeholder="選考メモなど" />
      </div>

      <QuestionsEditor questions={questions} onChange={setQuestions} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white">本文（設問とは別に自由に書けます）</span>
        <textarea
          name="contentMd"
          defaultValue={initial?.contentMd ?? ""}
          maxLength={20000}
          rows={8}
          className="dq-input text-sm"
        />
      </label>

      <ApiErrorMessage error={error} labels={ES_FIELD_LABELS} />

      <div className="flex flex-wrap gap-3">
        <button type="submit" value="save" className="dq-button-secondary" disabled={pending || !company}>
          {pending ? "保存中…" : "下書きとして保存"}
        </button>
        {canSubmit && (
          <button type="submit" value="submit" className="dq-button" disabled={pending || !company}>
            保存して提出する
          </button>
        )}
      </div>
    </form>
  );
}

function Field(props: {
  label: string;
  name: string;
  defaultValue?: string | null;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white">{props.label}</span>
      <input
        name={props.name}
        defaultValue={props.defaultValue ?? ""}
        maxLength={props.maxLength}
        required={props.required}
        placeholder={props.placeholder}
        className="dq-input text-sm"
      />
    </label>
  );
}
