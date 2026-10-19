import { describe, expect, it } from "vitest";
import { sanitizeMarkdown } from "./sanitize";

describe("sanitizeMarkdown", () => {
  it("strips heading markers of all levels", () => {
    expect(sanitizeMarkdown("# 見出し1")).toBe("見出し1");
    expect(sanitizeMarkdown("###### 見出し6")).toBe("見出し6");
  });

  it("normalizes bullet markers to a single style", () => {
    expect(sanitizeMarkdown("- item")).toBe("・item");
    expect(sanitizeMarkdown("* item")).toBe("・item");
    expect(sanitizeMarkdown("・item")).toBe("・item");
  });

  it("removes bold markers", () => {
    expect(sanitizeMarkdown("これは**強調**テキストです")).toBe("これは強調テキストです");
  });

  it("does not mistake a line starting with bold text for a bullet", () => {
    expect(sanitizeMarkdown("**強み**は技術力")).toBe("強みは技術力");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeMarkdown("  text  ")).toBe("text");
  });

  it("handles multiple rules mixed across lines", () => {
    const input = "## タイトル\n- **重要**な項目\n・もう一つの項目\n";
    expect(sanitizeMarkdown(input)).toBe("タイトル\n・重要な項目\n・もう一つの項目");
  });
});
