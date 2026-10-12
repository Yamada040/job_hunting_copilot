import { describe, expect, it } from "vitest";

import { countCharacters, rewriteRange } from "./characters";

describe("countCharacters", () => {
  it("改行は数えない", () => {
    expect(countCharacters("あい\nう\r\nえ")).toBe(4);
  });

  it("空白は数える", () => {
    expect(countCharacters("あ い")).toBe(3);
  });

  it("絵文字は1文字として数える", () => {
    expect(countCharacters("😀あ")).toBe(2);
  });
});

describe("rewriteRange", () => {
  it("上限の9割（切り上げ）から上限まで", () => {
    expect(rewriteRange(400)).toEqual({ min: 360, max: 400 });
    expect(rewriteRange(250)).toEqual({ min: 225, max: 250 });
    expect(rewriteRange(5)).toEqual({ min: 5, max: 5 });
  });
});
