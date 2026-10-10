"use client";

import { useActionState } from "react";

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
        <label className="block space-y-1 text-xs text-white/70">
          登録ユーザー名
          <input value={displayName || "未設定"} disabled className="dq-input text-sm" />
        </label>
        <label className="block space-y-1 text-xs text-white/70">
          ログインメール
          <input value={email} disabled className="dq-input text-sm" />
        </label>
      </div>

      <label className="block space-y-1 text-xs text-white/70">
        件名
        <input
          name="subject"
          defaultValue={preservedValues?.subject}
          className="dq-input text-sm"
          placeholder="例）ログインについて"
          required
        />
      </label>

      <label className="block space-y-1 text-xs text-white/70">
        お問い合わせ内容
        <textarea
          name="message"
          rows={8}
          defaultValue={preservedValues?.message}
          className="dq-input text-sm"
          placeholder="お問い合わせ内容をご記入ください"
          required
        />
      </label>

      {submitState?.status === "error" ? (
        <p className="text-xs text-rose-700 dark:text-rose-300">{submitState.message}</p>
      ) : null}
      {submitState?.status === "success" ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">{submitState.message}</p>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-white/60">送信内容には登録ユーザー名とログインメールが含まれます。</p>
        <button
          type="submit"
          disabled={isPending}
          className="sidebar-link-style text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "送信状態を確認中..." : "送信する"}
        </button>
      </div>
    </form>
  );
}
