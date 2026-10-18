"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, unwrap } from "@/lib/api/client";
import { useMe } from "@/lib/api/me";
import { contactRequestSchema, guestContactRequestSchema } from "@/lib/validation/schemas/contact";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { FormActions } from "@/app/_components/form/form-actions";
import { LeaveGuard } from "@/app/_components/form/leave-guard";
import { useFormEditing } from "@/app/_components/form/use-form-editing";

type ContactFormProps =
  | {
      signedIn: true;
      /** プロフィールに氏名が無いときに使う、ログイン情報（Googleアカウント）の名前 */
      accountName: string;
      email: string;
    }
  | { signedIn: false };

type SubmitValues = {
  subject: string;
  message: string;
  email: string;
};

type SubmitState =
  | { status: "success"; values: null }
  | { status: "invalid"; message: string; values: SubmitValues }
  | { status: "failed"; error: unknown; values: SubmitValues }
  | null;

const FIELD_LABELS = { subject: "件名", message: "お問い合わせ内容", email: "返信先のメールアドレス" };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ContactForm(props: ContactFormProps) {
  const { dirty, reset, formProps } = useFormEditing();
  const [submitState, formAction, isPending] = useActionState<SubmitState, FormData>(async (_prev, formData) => {
    const values: SubmitValues = {
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
      email: String(formData.get("email") ?? ""),
    };
    // 人には見えない欄。自動で送ってくるものだけが値を入れる（バックエンドが見分けて捨てる）
    const website = String(formData.get("website") ?? "");

    // ログイン中はログインのメールアドレスに返信するので、返信先は聞かない
    const validation = props.signedIn
      ? contactRequestSchema.safeParse(values)
      : guestContactRequestSchema.safeParse(values);
    if (!validation.success) {
      return {
        status: "invalid",
        message: validation.error.issues[0]?.message ?? "入力内容を確認してください",
        values,
      };
    }

    try {
      // 送信中の表示が一瞬で消えてちらつかないよう、最低600msは待つ
      await Promise.all([
        unwrap(api.POST("/v1/contact", { body: { ...validation.data, ...(website ? { website } : {}) } })),
        wait(600),
      ]);
      // 送ると入力欄は空に戻るので、確かめずに移動してよい状態に戻す
      reset();
      showSuccessNotice("お問い合わせを送りました");
      return { status: "success", values: null };
    } catch (error) {
      return { status: "failed", error, values };
    }
  }, null);

  // 送信失敗時はReactのフォーム自動リセット後もdefaultValue経由で入力値を復元する
  const preservedValues =
    submitState?.status === "invalid" || submitState?.status === "failed" ? submitState.values : null;

  return (
    <form {...formProps} action={formAction} className="space-y-4">
      {props.signedIn ? (
        <SenderInfo accountName={props.accountName} email={props.email} />
      ) : (
        <div className="space-y-1">
          <Label htmlFor="contact-email" className="text-xs text-muted-foreground">
            返信先のメールアドレス
          </Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={preservedValues?.email}
            placeholder="例）you@example.com"
            required
          />
        </div>
      )}

      {/* 迷惑な自動送信を見分けるための欄。画面の外に置き、読み上げやキーボードの移動からも外す */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-clip">
        <label htmlFor="contact-website">Webサイト</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contact-subject" className="text-xs text-muted-foreground">
          件名
        </Label>
        <Input
          id="contact-subject"
          name="subject"
          defaultValue={preservedValues?.subject}
          placeholder="例）ログインできません"
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
          placeholder="どの画面で、何をしたときに、どうなったかを書いていただくと、早くお答えできます"
          required
        />
      </div>

      {submitState?.status === "invalid" ? <p className="text-xs text-destructive">{submitState.message}</p> : null}
      {submitState?.status === "failed" ? <ApiErrorMessage error={submitState.error} labels={FIELD_LABELS} /> : null}
      {submitState?.status === "success" ? (
        <p role="status" className="text-sm text-success">
          お問い合わせを受け付けました。数日以内に、メールで返信します。
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {props.signedIn
          ? "返信はログインのメールアドレスにお送りします。送信内容には登録ユーザー名も含まれます。"
          : "アカウントをお持ちの方は、ログインしてから送ると返信先の入力を省けます。"}
      </p>
      <FormActions dirty={dirty} shortcut="送信">
        <Button type="submit" variant="default" disabled={isPending}>
          {isPending ? "送信中..." : "送信する"}
        </Button>
      </FormActions>
      <LeaveGuard when={dirty && !isPending} />
    </form>
  );
}

/** ログイン中の送り主。プロフィールの氏名を読むので、ログインしているときだけ描く */
function SenderInfo({ accountName, email }: { accountName: string; email: string }) {
  const { data: me } = useMe();
  const displayName = me?.fullName?.trim() || accountName || "未設定";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="contact-account-name" className="text-xs text-muted-foreground">
          登録ユーザー名
        </Label>
        <Input id="contact-account-name" value={displayName} disabled />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact-login-email" className="text-xs text-muted-foreground">
          ログインメール
        </Label>
        <Input id="contact-login-email" value={email} disabled />
      </div>
    </div>
  );
}
