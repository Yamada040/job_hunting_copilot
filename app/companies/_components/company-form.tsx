"use client";

import type { Company, CompanyStage } from "@/lib/api/companies";
import { COMPANY_STAGES, COMPANY_STAGE_LABELS } from "@/lib/companies/stages";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

/** フォームの入力値。送り方（登録か更新か）は呼び出し側が決める。 */
export type CompanyFormValues = {
  name: string;
  industry: string;
  url: string;
  mypageId: string;
  mypageUrl: string;
  memo: string;
  stage: CompanyStage;
  preference: number | null;
  favorite: boolean;
};

export const COMPANY_FIELD_LABELS: Record<string, string> = {
  name: "企業名",
  industry: "業界",
  url: "企業サイトURL",
  mypageId: "マイページID",
  mypageUrl: "マイページURL",
  memo: "メモ",
  stage: "選考状況",
  preference: "志望度",
};

// maxLength は backend/api/openapi.yaml の CompanyCreate / CompanyUpdate と同じ値（超えた入力はGoが400で拒否する）
const textFields = [
  { name: "name", maxLength: 100, placeholder: "例）株式会社サンプル", required: true },
  { name: "industry", maxLength: 100, placeholder: "例）IT / コンサル / メーカー" },
  { name: "url", maxLength: 500, placeholder: "https://example.com" },
  { name: "mypageId", maxLength: 100, placeholder: "ログインID" },
  { name: "mypageUrl", maxLength: 500, placeholder: "https://mypage.example.com" },
] as const;

type Props = {
  initial?: Company;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: CompanyFormValues) => void;
};

export function CompanyForm({ initial, submitLabel, pending, error, onSubmit }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const preference = text("preference");
    onSubmit({
      name: text("name"),
      industry: text("industry"),
      url: text("url"),
      mypageId: text("mypageId"),
      mypageUrl: text("mypageUrl"),
      memo: text("memo"),
      stage: text("stage") as CompanyStage,
      preference: preference ? Number(preference) : null,
      favorite: form.get("favorite") === "on",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="dq-card space-y-6 p-8">
      <div className="grid gap-6 md:grid-cols-2">
        {textFields.map((f) => (
          <label key={f.name} className="block space-y-2">
            <span className="text-sm font-medium text-white">{COMPANY_FIELD_LABELS[f.name]}</span>
            <input
              name={f.name}
              defaultValue={initial?.[f.name] ?? ""}
              maxLength={f.maxLength}
              required={"required" in f}
              placeholder={f.placeholder}
              className="dq-input text-sm"
            />
          </label>
        ))}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">{COMPANY_FIELD_LABELS.stage}</span>
          <select name="stage" defaultValue={initial?.stage ?? "not_entered"} className="dq-input text-sm">
            {COMPANY_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {COMPANY_STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">{COMPANY_FIELD_LABELS.preference}（1〜5）</span>
          <select name="preference" defaultValue={initial?.preference ?? ""} className="dq-input text-sm">
            <option value="">未設定</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end text-sm text-white">
          <input
            type="checkbox"
            name="favorite"
            defaultChecked={initial?.favorite ?? false}
            className="h-4 w-4 accent-amber-300"
          />
          お気に入り
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white">{COMPANY_FIELD_LABELS.memo}</span>
        <textarea
          name="memo"
          defaultValue={initial?.memo ?? ""}
          maxLength={2000}
          rows={4}
          className="dq-input text-sm"
        />
      </label>

      <ApiErrorMessage error={error} labels={COMPANY_FIELD_LABELS} />

      <button type="submit" className="dq-button" disabled={pending}>
        {pending ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
