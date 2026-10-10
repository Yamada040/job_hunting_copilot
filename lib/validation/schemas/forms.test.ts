import { describe, expect, it } from "vitest";
import { webtestAnswerFormSchema, webtestQuestionFormSchema } from "./forms";

describe("webtestQuestionFormSchema", () => {
  const base = { title: "問題1", body: "本文", answer: "答え" };

  it("requires title/body/answer to be non-blank after trimming", () => {
    expect(() => webtestQuestionFormSchema.parse({ ...base, title: "   " })).toThrow();
  });

  it("rejects a negative time_limit", () => {
    expect(() => webtestQuestionFormSchema.parse({ ...base, time_limit: "-5" })).toThrow();
  });

  it("accepts a valid non-negative time_limit", () => {
    const result = webtestQuestionFormSchema.parse({ ...base, time_limit: "60" });
    expect(result.time_limit).toBe(60);
  });
});

describe("webtestAnswerFormSchema", () => {
  it("defaults answer to an empty string when omitted", () => {
    const result = webtestAnswerFormSchema.parse({});
    expect(result.answer).toBe("");
  });

  it("treats an empty time_spent string as undefined", () => {
    const result = webtestAnswerFormSchema.parse({ time_spent: "" });
    expect(result.time_spent).toBeUndefined();
  });
});
