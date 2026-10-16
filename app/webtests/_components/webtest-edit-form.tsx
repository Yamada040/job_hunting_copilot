"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { FormActions } from "@/app/_components/form/form-actions";
import { useUpdateWebtestQuestion, type WebtestQuestionDetail } from "@/lib/api/webtests";

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

export function WebtestEditForm({ question, onCancel }: { question: WebtestQuestionDetail; onCancel: () => void }) {
  const updateQuestion = useUpdateWebtestQuestion(question.id);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const timeLimit = text("timeLimit");
    updateQuestion.mutate(
      {
        title: text("title"),
        body: text("body"),
        answer: text("answer"),
        choices: text("choices")
          .split("\n")
          .map((choice) => choice.trim())
          .filter(Boolean),
        explanation: text("explanation") || undefined,
        testType: text("testType") || undefined,
        category: text("category") || undefined,
        format: text("format") || undefined,
        difficulty: text("difficulty") || undefined,
        timeLimit: timeLimit ? Number(timeLimit) : undefined,
      },
      { onSuccess: onCancel },
    );
  };

  return (
    <Card className="overflow-visible p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="タイトル" defaultValue={question.title} maxLength={100} required />
          <Field name="category" label="カテゴリ" defaultValue={question.category ?? ""} />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Field name="testType" label="テスト形式" defaultValue={question.testType ?? ""} />
          <Field name="format" label="形式" defaultValue={question.format ?? ""} />
          <Field name="difficulty" label="難易度" defaultValue={question.difficulty ?? ""} />
          <Field
            name="timeLimit"
            label="制限時間（秒）"
            defaultValue={question.timeLimit?.toString() ?? ""}
            type="number"
          />
        </div>
        <FieldArea name="body" label="問題文" defaultValue={question.body} rows={6} required />
        <div className="grid gap-4 md:grid-cols-2">
          <FieldArea name="choices" label="選択肢（改行区切り）" defaultValue={question.choices.join("\n")} rows={4} />
          <Field name="answer" label="正解" defaultValue={question.answer} maxLength={500} required />
        </div>
        <FieldArea name="explanation" label="解説（任意）" defaultValue={question.explanation ?? ""} rows={4} />
        {question.attempts.length > 0 && (
          <p className="text-xs text-muted-foreground">編集後も、過去の解答履歴とその時点の正誤は残ります。</p>
        )}
        <ApiErrorMessage error={updateQuestion.error} labels={FIELD_LABELS} />
        <FormActions dirty>
          <Button type="submit" disabled={updateQuestion.isPending}>
            {updateQuestion.isPending ? "保存中…" : "保存する"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={updateQuestion.isPending}>
            キャンセル
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  maxLength = 50,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
}) {
  const id = `webtest-${name}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} defaultValue={defaultValue} required={required} maxLength={maxLength} />
    </div>
  );
}

function FieldArea({
  name,
  label,
  defaultValue,
  rows,
  required,
}: {
  name: string;
  label: string;
  defaultValue: string;
  rows: number;
  required?: boolean;
}) {
  const id = `webtest-${name}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} name={name} defaultValue={defaultValue} rows={rows} required={required} />
    </div>
  );
}
