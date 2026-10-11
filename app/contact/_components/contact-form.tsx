"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, unwrap } from "@/lib/api/client";
import { useMe } from "@/lib/api/me";
import { contactRequestSchema } from "@/lib/validation/schemas/contact";

interface ContactFormProps {
  /** プロフィールに氏名が無いときに使う、ログイン情報（Googleアカウント）の名前 */
  accountName: string;
  email: string;
}

type SubmitValues = {
  subject: string;
  message: string;
};

type SubmitState =
  | { status: "success"; message: string; values: null }
  | { status: "error"; message: string; values: SubmitValues }
  | null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ContactForm({ accountName, email }: ContactFormProps) {
  const { data: me } = useMe();
  const displayName = me?.fullName?.trim() || accountName || "未設定";
  const [submitState, formAction, isPending] = useActionState<SubmitState, FormData>(async (_prev, formData) => {
    const values: SubmitValues = {
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    const validation = contactRequestSchema.safeParse({
      subject: formData.get("subject"),
      message: formData.get("message"),
    });

    if (!validation.success) {
      return {
        status: "error",
        message: validation.error.issues[0]?.message ?? "入力内容を確認してください",
        values,
      };
    }

    try {
      // 送信中の表示が一瞬で消えてちらつかないよう、最低600msは待つ
      await Promise.all([unwrap(api.POST("/v1/contact", { body: validation.data })), wait(600)]);
      return { status: "success", message: "送信に成功しました。", values: null };
    } catch (e) {
      return {
        status: "error",
        message: e instanceof ApiError ? e.problem.title : "送信に失敗しました。通信環境を確認して再度お試しください。",
        values,
      };
    }
  }, null);

  // 送信失敗時はReactのフォーム自動リセット後もdefaultValue経由で入力値を復元する
  const preservedValues = submitState?.status === "error" ? submitState.values : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="contact-account-name" className="text-xs text-muted-foreground">
            登録ユーザー名
          </Label>
          <Input id="contact-account-name" value={displayName || "未設定"} disabled />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contact-email" className="text-xs text-muted-foreground">
            ログインメール
          </Label>
          <Input id="contact-email" value={email} disabled />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="contact-subject" className="text-xs text-muted-foreground">
          件名
        </Label>
        <Input
          id="contact-subject"
          name="subject"
          defaultValue={preservedValues?.subject}
          placeholder="例）ログインについて"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contact-message" className="text-xs text-muted-foreground">
          お問い合わせ内容
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          rows={8}
          defaultValue={preservedValues?.message}
          placeholder="お問い合わせ内容をご記入ください"
          required
        />
      </div>

      {submitState?.status === "error" ? <p className="text-xs text-destructive">{submitState.message}</p> : null}
      {submitState?.status === "success" ? <p className="text-xs text-emerald-600">{submitState.message}</p> : null}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">送信内容には登録ユーザー名とログインメールが含まれます。</p>
        <Button type="submit" variant="quest" disabled={isPending}>
          {isPending ? "送信状態を確認中..." : "送信する"}
        </Button>
      </div>
    </form>
  );
}
