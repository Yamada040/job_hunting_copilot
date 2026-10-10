import { describe, expect, it } from "vitest";
import {
  companyFormSchema,
  esFormSchema,
  esQuestionSchema,
  esQuestionsSchema,
  profileFormSchema,
  webtestAnswerFormSchema,
  webtestQuestionFormSchema,
} from "./forms";

describe("profileFormSchema", () => {
  it("accepts full_name alone", () => {
    const result = profileFormSchema.parse({ full_name: "山田太郎" });
    expect(result.full_name).toBe("山田太郎");
  });

  it("rejects a missing full_name", () => {
    expect(() => profileFormSchema.parse({})).toThrow();
  });

  it("rejects a whitespace-only full_name", () => {
    expect(() => profileFormSchema.parse({ full_name: "   " })).toThrow();
  });
});

describe("companyFormSchema", () => {
  const base = { name: "テスト株式会社" };

  it("coerces a numeric string preference to a number", () => {
    const result = companyFormSchema.parse({ ...base, preference: "12", favorite: "on" });
    expect(result.preference).toBe(12);
  });

  it("converts an empty preference string to undefined", () => {
    const result = companyFormSchema.parse({ ...base, preference: "", favorite: undefined });
    expect(result.preference).toBeUndefined();
  });

  it('sets favorite to true only for "on"', () => {
    expect(companyFormSchema.parse({ ...base, favorite: "on" }).favorite).toBe(true);
    expect(companyFormSchema.parse({ ...base, favorite: undefined }).favorite).toBe(false);
  });
});

describe("esQuestionSchema / esQuestionsSchema", () => {
  it("allows an empty array", () => {
    expect(esQuestionsSchema.parse([])).toEqual([]);
  });

  it("allows an object with only some fields", () => {
    expect(esQuestionSchema.parse({ prompt: "自己PR" })).toEqual({ prompt: "自己PR" });
  });
});

describe("esFormSchema", () => {
  it("applies defaults for content_md/tags/intent", () => {
    const result = esFormSchema.parse({ title: "ES1" });
    expect(result.content_md).toBe("");
    expect(result.tags).toBe("");
    expect(result.intent).toBe("save");
  });

  it("requires title", () => {
    expect(() => esFormSchema.parse({})).toThrow();
  });
});

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
