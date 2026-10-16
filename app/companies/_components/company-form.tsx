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
import { FormActions } from "@/app/_components/form/form-actions";
import { FormSection } from "@/app/_components/form/form-section";
import { LeaveGuard } from "@/app/_components/form/leave-guard";
import { useFormEditing } from "@/app/_components/form/use-form-editing";

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
const basicFields = [
  { name: "name", maxLength: 100, placeholder: "例）株式会社サンプル", required: true },
  { name: "industry", maxLength: 100, placeholder: "例）IT / コンサル / メーカー" },
  { name: "url", maxLength: 500, placeholder: "https://example.com" },
] as const;
const mypageFields = [
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
  const { dirty, formProps } = useFormEditing();
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
    <Card className="overflow-visible p-8">
      <form {...formProps} onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="基本情報" className="md:grid-cols-2">
          {basicFields.map((f) => (
            <TextField key={f.name} field={f} initial={initial} />
          ))}
        </FormSection>

        <FormSection title="選考" className="md:grid-cols-2">
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
          {mypageFields.map((f) => (
            <TextField key={f.name} field={f} initial={initial} />
          ))}
          {/* FormData の favorite で値を読むので、Radix の Checkbox ではなくネイティブの checkbox のままにする */}
          <Label className="font-normal">
            <input
              type="checkbox"
              name="favorite"
              defaultChecked={initial?.favorite ?? false}
              className="h-4 w-4 accent-primary"
            />
            お気に入り
          </Label>
        </FormSection>

        <FormSection title="メモ">
          <div className="space-y-2">
            <Label htmlFor="company-memo" className="sr-only">
              {COMPANY_FIELD_LABELS.memo}
            </Label>
            <Textarea
              id="company-memo"
              name="memo"
              defaultValue={initial?.memo ?? ""}
              maxLength={2000}
              rows={4}
              className="min-h-24"
            />
          </div>
        </FormSection>

        <ApiErrorMessage error={error} labels={COMPANY_FIELD_LABELS} />

        <FormActions dirty={dirty}>
          <Button type="submit" variant="default" disabled={pending}>
            {pending ? "保存中…" : submitLabel}
          </Button>
        </FormActions>
      </form>
      <LeaveGuard when={dirty && !pending} />
    </Card>
  );
}

function TextField({
  field,
  initial,
}: {
  field: (typeof basicFields)[number] | (typeof mypageFields)[number];
  initial?: Company;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`company-${field.name}`}>{COMPANY_FIELD_LABELS[field.name]}</Label>
      <Input
        id={`company-${field.name}`}
        name={field.name}
        defaultValue={initial?.[field.name] ?? ""}
        maxLength={field.maxLength}
        required={"required" in field}
        placeholder={field.placeholder}
      />
    </div>
  );
}
