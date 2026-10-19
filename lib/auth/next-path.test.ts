import { describe, expect, it } from "vitest";

import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("サイトの中のパスはクエリを含めてそのまま通す", () => {
    expect(safeNextPath("/dashboard?x=1")).toBe("/dashboard?x=1");
  });

  it.each([
    ["バックスラッシュで外部のホストになる", "/\\evil.com"],
    ["タブを挟んで外部のホストになる", "/\t/evil.com"],
    ["スキームを省いた外部のURL", "//evil.com"],
    ["外部の絶対URL", "https://evil.com"],
  ])("%s値は通さない", (_, next) => {
    expect(safeNextPath(next)).toBeUndefined();
  });

  it("値が無ければ undefined", () => {
    expect(safeNextPath(null)).toBeUndefined();
    expect(safeNextPath(undefined)).toBeUndefined();
  });
});
