"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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

// maxLength は backend/api/openapi.yaml の CompanyCreate / CompanyUpdate と同じ値（超えた入力はバックエンドが400で拒否する）
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
    <Card className="p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {textFields.map((f) => (
            <div key={f.name} className="space-y-2">
              <Label htmlFor={`company-${f.name}`}>{COMPANY_FIELD_LABELS[f.name]}</Label>
              <Input
                id={`company-${f.name}`}
                name={f.name}
                defaultValue={initial?.[f.name] ?? ""}
                maxLength={f.maxLength}
                required={"required" in f}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="company-stage">{COMPANY_FIELD_LABELS.stage}</Label>
            <NativeSelect
              id="company-stage"
              name="stage"
              defaultValue={initial?.stage ?? "not_entered"}
              className="w-full"
            >
              {COMPANY_STAGES.map((stage) => (
                <NativeSelectOption key={stage} value={stage}>
                  {COMPANY_STAGE_LABELS[stage]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-preference">{COMPANY_FIELD_LABELS.preference}（1〜5）</Label>
            <NativeSelect
              id="company-preference"
              name="preference"
              defaultValue={initial?.preference ?? ""}
              className="w-full"
            >
              <NativeSelectOption value="">未設定</NativeSelectOption>
              {[1, 2, 3, 4, 5].map((n) => (
                <NativeSelectOption key={n} value={n}>
                  {n}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {/* FormData の favorite で値を読むので、Radix の Checkbox ではなくネイティブの checkbox のままにする */}
          <Label className="self-end font-normal">
            <input
              type="checkbox"
              name="favorite"
              defaultChecked={initial?.favorite ?? false}
              className="h-4 w-4 accent-sky-500"
            />
            お気に入り
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-memo">{COMPANY_FIELD_LABELS.memo}</Label>
          <Textarea
            id="company-memo"
            name="memo"
            defaultValue={initial?.memo ?? ""}
            maxLength={2000}
            rows={4}
            className="min-h-24"
          />
        </div>

        <ApiErrorMessage error={error} labels={COMPANY_FIELD_LABELS} />

        <Button type="submit" variant="quest" disabled={pending}>
          {pending ? "保存中…" : submitLabel}
        </Button>
      </form>
    </Card>
  );
}
