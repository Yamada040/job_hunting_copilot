"use client";

import { useRouter } from "next/navigation";

import { useCreateWebtestQuestion } from "@/lib/api/webtests";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

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

export function NewWebtestForm() {
  const router = useRouter();
  const createQuestion = useCreateWebtestQuestion();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const timeLimit = text("timeLimit");
    createQuestion.mutate(
      {
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
      },
      { onSuccess: () => router.push(ROUTES.WEBTESTS) },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="dq-card space-y-4 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="title" label="タイトル" maxLength={100} required placeholder="例）表の読み取り（売上推移）" />
        <Field name="category" label="カテゴリ" placeholder="非言語 / 言語 / 英語 など" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field name="testType" label="テスト形式" placeholder="SPI / 玉手箱 / TG-WEB など" />
        <Field name="format" label="形式" placeholder="表/グラフ/文章/計算 など" />
        <Field name="difficulty" label="難易度" placeholder="易 / 普通 / 難" />
        <Field name="timeLimit" label="制限時間（秒）" placeholder="60" type="number" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-800">
          問題文 <span className="text-rose-500">*</span>
        </label>
        <textarea name="body" required rows={6} className="dq-input text-sm" placeholder="表や文章の内容を記載" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">選択肢（改行区切り）</label>
          <textarea name="choices" rows={4} className="dq-input text-sm" placeholder="A)\nB)\nC)\nD)" />
        </div>
        <Field name="answer" label="正解" maxLength={500} required placeholder="例）C" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-800">解説（任意）</label>
        <textarea name="explanation" rows={4} className="dq-input text-sm" placeholder="解答の考え方や計算手順を記載" />
      </div>
      <ApiErrorMessage error={createQuestion.error} labels={FIELD_LABELS} />
      <div className="pt-2 flex justify-start">
        <button type="submit" className="dq-button" disabled={createQuestion.isPending}>
          {createQuestion.isPending ? "保存中…" : "保存する"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  type = "text",
  maxLength = 50,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="dq-input text-sm"
      />
    </label>
  );
}
