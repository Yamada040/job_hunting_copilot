"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CompanySummary } from "@/lib/api/companies";
import type { EsEntry, EsQuestion } from "@/lib/api/es";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { CompanyPicker } from "@/app/_components/company-picker";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { FormActions } from "@/app/_components/form/form-actions";
import { FormSection } from "@/app/_components/form/form-section";
import { LeaveGuard } from "@/app/_components/form/leave-guard";
import { useFormEditing } from "@/app/_components/form/use-form-editing";
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
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, markDirty, formProps } = useFormEditing();

  const readValues = (formElement: HTMLFormElement): EsFormValues => {
    const form = new FormData(formElement);
    const text = (name: string) => String(form.get(name) ?? "");
    return {
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
    };
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(readValues(e.currentTarget), false);
  };

  // 提出のボタンは確認ダイアログを開くだけの type="button" でブラウザの入力チェックが走らないので、開く前に確かめる。
  // 入力に誤りがあればクリックの既定の動作を止め、ダイアログを開かない
  const checkBeforeConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!formRef.current?.reportValidity()) e.preventDefault();
  };

  const handleConfirmSubmit = () => {
    if (formRef.current) onSubmit(readValues(formRef.current), true);
  };

  return (
    <Card className="overflow-visible px-8 py-8">
      <form ref={formRef} {...formProps} onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="基本情報" className="md:grid-cols-2">
          <div className="space-y-2">
            {/* 企業の欄は CompanyPicker の入力が aria-label="企業" を持つので、ここを label にすると名前が二重になる */}
            <span className="text-sm font-medium">企業</span>
            <CompanyPicker
              value={company}
              onChange={(next) => {
                setCompany(next);
                markDirty();
              }}
            />
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
          <Field label="締切日" name="deadline" type="date" defaultValue={initial?.deadline} />
          <Field
            label="タグ（カンマ区切り）"
            name="tags"
            defaultValue={initial?.tags.join(", ")}
            placeholder="例）IT, 第一志望"
          />
          <Field label="メモ" name="memo" defaultValue={initial?.memo} maxLength={2000} placeholder="選考メモなど" />
        </FormSection>

        <FormSection title="設問と回答">
          <QuestionsEditor
            questions={questions}
            onChange={(next) => {
              setQuestions(next);
              markDirty();
            }}
          />
        </FormSection>

        <FormSection title="本文" description="設問とは別に、自由に書けます">
          <Label htmlFor="es-contentMd" className="sr-only">
            本文
          </Label>
          <Textarea
            id="es-contentMd"
            name="contentMd"
            defaultValue={initial?.contentMd ?? ""}
            maxLength={20000}
            rows={8}
            className="min-h-44"
          />
        </FormSection>

        <ApiErrorMessage error={error} labels={ES_FIELD_LABELS} />

        <FormActions dirty={dirty}>
          <Button type="submit" variant="outline" disabled={pending || !company}>
            {pending ? "保存中…" : "下書きとして保存"}
          </Button>
          {canSubmit && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="default" disabled={pending || !company} onClick={checkBeforeConfirm}>
                  保存して提出する
                </Button>
              }
              title="ESを提出しますか？"
              description="提出すると下書きに戻せません。"
              confirmLabel="提出する"
              onConfirm={handleConfirmSubmit}
            />
          )}
        </FormActions>
      </form>
      <LeaveGuard when={dirty && !pending} />
    </Card>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const id = `es-${props.name}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{props.label}</Label>
      <Input
        id={id}
        name={props.name}
        type={props.type}
        defaultValue={props.defaultValue ?? ""}
        maxLength={props.maxLength}
        required={props.required}
        placeholder={props.placeholder}
      />
    </div>
  );
}
