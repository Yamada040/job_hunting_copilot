import { describe, expect, it } from "vitest";
import { contactRequestSchema } from "./contact";

describe("contactRequestSchema", () => {
  it("accepts subject at exactly the 120 char boundary", () => {
    const subject = "あ".repeat(120);
    expect(contactRequestSchema.parse({ subject, message: "本文" }).subject).toHaveLength(120);
  });

  it("rejects subject exceeding the 120 char boundary with the Japanese message", () => {
    const subject = "あ".repeat(121);
    const result = contactRequestSchema.safeParse({ subject, message: "本文" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("件名は120文字以内で入力してください");
    }
  });

  it("accepts message at exactly the 2000 char boundary", () => {
    const message = "あ".repeat(2000);
    expect(contactRequestSchema.parse({ subject: "件名", message }).message).toHaveLength(2000);
  });

  it("rejects message exceeding the 2000 char boundary with the Japanese message", () => {
    const message = "あ".repeat(2001);
    const result = contactRequestSchema.safeParse({ subject: "件名", message });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("お問い合わせ内容は2000文字以内で入力してください");
    }
  });

  it("rejects an empty subject/message with the Japanese required messages", () => {
    const result = contactRequestSchema.safeParse({ subject: "", message: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("件名を入力してください");
      expect(messages).toContain("お問い合わせ内容を入力してください");
    }
  });
});
