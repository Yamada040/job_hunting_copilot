"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WebtestQuestionCreate, WebtestQuestionDetail } from "@/lib/api/webtests";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { FormActions } from "@/app/_components/form/form-actions";
import { LeaveGuard } from "@/app/_components/form/leave-guard";
import { useFormEditing } from "@/app/_components/form/use-form-editing";

const FIELD_LABELS: Record<string, string> = {
  title: "タイトル",
  body: "問題文",
  answer: "正解",
  choices: "選択肢",
  explanation: "解説",
  testType: "テスト形式",
  category: "カテゴリ",
  format: "形式",
  difficulty: "難易度",
  timeLimit: "制限時間",
};

type Props = {
  /** 編集なら今の問題。作成なら無し */
  initial?: WebtestQuestionDetail;
  pending: boolean;
  error: unknown;
  onSubmit: (values: WebtestQuestionCreate) => void;
};

/** 問題の作成と編集で使うフォーム。 */
export function WebtestForm({ initial, pending, error, onSubmit }: Props) {
  const { dirty, formProps } = useFormEditing();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const timeLimit = text("timeLimit");
    onSubmit({
      title: text("title"),
      body: text("body"),
      answer: text("answer"),
      choices: text("choices")
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean),
      explanation: text("explanation"),
      testType: text("testType"),
      category: text("category"),
      format: text("format"),
      difficulty: text("difficulty"),
      timeLimit: timeLimit ? Number(timeLimit) : undefined,
    });
  };

  return (
    <Card className="overflow-visible p-6">
      <form {...formProps} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            name="title"
            label="タイトル"
            maxLength={100}
            required
            placeholder="例）表の読み取り（売上推移）"
            defaultValue={initial?.title}
          />
          <Field
            name="category"
            label="カテゴリ"
            placeholder="非言語 / 言語 / 英語 など"
            defaultValue={initial?.category}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Field
            name="testType"
            label="テスト形式"
            placeholder="SPI / 玉手箱 / TG-WEB など"
            defaultValue={initial?.testType}
          />
          <Field name="format" label="形式" placeholder="表/グラフ/文章/計算 など" defaultValue={initial?.format} />
          <Field name="difficulty" label="難易度" placeholder="易 / 普通 / 難" defaultValue={initial?.difficulty} />
          <Field
            name="timeLimit"
            label="制限時間（秒）"
            placeholder="60"
            type="number"
            defaultValue={initial?.timeLimit?.toString()}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webtest-body">
            問題文 <RequiredMark />
          </Label>
          <Textarea
            id="webtest-body"
            name="body"
            required
            rows={6}
            placeholder="表や文章の内容を記載"
            defaultValue={initial?.body}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="webtest-choices">選択肢（改行区切り）</Label>
            <Textarea
              id="webtest-choices"
              name="choices"
              rows={4}
              placeholder="A)\nB)\nC)\nD)"
              defaultValue={initial?.choices.join("\n")}
            />
          </div>
          <Field
            name="answer"
            label="正解"
            maxLength={500}
            required
            placeholder="例）C"
            defaultValue={initial?.answer}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webtest-explanation">解説（任意）</Label>
          <Textarea
            id="webtest-explanation"
            name="explanation"
            rows={4}
            placeholder="解答の考え方や計算手順を記載"
            defaultValue={initial?.explanation ?? undefined}
          />
        </div>
        <ApiErrorMessage error={error} labels={FIELD_LABELS} />
        <FormActions dirty={dirty}>
          <Button type="submit" variant="default" disabled={pending}>
            {pending ? "保存中…" : "保存する"}
          </Button>
        </FormActions>
      </form>
      <LeaveGuard when={dirty && !pending} />
    </Card>
  );
}

function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

function Field({
  name,
  label,
  placeholder,
  required,
  type = "text",
  maxLength = 50,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  defaultValue?: string | null;
}) {
  const id = `webtest-${name}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        defaultValue={defaultValue ?? undefined}
      />
    </div>
  );
}
