import { z } from "zod";

import type { components } from "@/lib/api/schema";
import type { SchemaShape } from "@/lib/validation/schema-shape";

// 迷惑な自動送信を見分ける website 欄は、人が入力しないので検証せず、送るときに別に足す
type ContactRequest = Omit<components["schemas"]["ContactRequest"], "website">;

const contactFields = {
  subject: z.string().trim().min(1, "件名を入力してください").max(120, "件名は120文字以内で入力してください"),
  message: z
    .string()
    .trim()
    .min(1, "お問い合わせ内容を入力してください")
    .max(2000, "お問い合わせ内容は2000文字以内で入力してください"),
};

/** ログイン中の問い合わせ。ログインのメールアドレスに返信するので、返信先は聞かない */
export const contactRequestSchema = z.object(contactFields satisfies SchemaShape<Omit<ContactRequest, "email">>);

/** ログインしていない人の問い合わせ。返信先が分からないので、メールアドレスを必須にする */
export const guestContactRequestSchema = z.object({
  ...contactFields,
  email: z
    .string()
    .trim()
    .min(1, "返信先のメールアドレスを入力してください")
    .max(254, "メールアドレスは254文字以内で入力してください")
    .pipe(z.email("メールアドレスの形式で入力してください")),
} satisfies SchemaShape<ContactRequest>);

export type ContactRequestInput = z.infer<typeof contactRequestSchema>;
