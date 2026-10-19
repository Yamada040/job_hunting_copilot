import { z } from "zod";

export const contactRequestSchema = z.object({
  subject: z.string().trim().min(1, "件名を入力してください").max(120, "件名は120文字以内で入力してください"),
  message: z
    .string()
    .trim()
    .min(1, "お問い合わせ内容を入力してください")
    .max(2000, "お問い合わせ内容は2000文字以内で入力してください"),
});

/** ログインしていない人の問い合わせ。返信先が分からないので、メールアドレスを必須にする */
export const guestContactRequestSchema = contactRequestSchema.extend({
  email: z
    .string()
    .trim()
    .min(1, "返信先のメールアドレスを入力してください")
    .max(254, "メールアドレスは254文字以内で入力してください")
    .pipe(z.email("メールアドレスの形式で入力してください")),
});

export type ContactRequestInput = z.infer<typeof contactRequestSchema>;
