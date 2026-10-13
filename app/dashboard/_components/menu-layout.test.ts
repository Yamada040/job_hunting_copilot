import { describe, expect, it } from "vitest";

import { coverflowLayout, offsetFrom } from "./menu-layout";

describe("offsetFrom", () => {
  it("端から端へ回り込み、近い向きのずれを返す", () => {
    expect(offsetFrom(1, 0, 9)).toBe(1);
    expect(offsetFrom(8, 0, 9)).toBe(-1);
    expect(offsetFrom(0, 8, 9)).toBe(1);
    expect(offsetFrom(3, 0.5, 9)).toBe(2.5);
  });
});

describe("coverflowLayout", () => {
  it("正面のカードはまっすぐ手前に置く", () => {
    expect(coverflowLayout(0)).toEqual({
      transform: "translateX(0px) translateZ(0px) rotateY(0deg)",
      opacity: 1,
      fog: 0,
      blurred: false,
      zIndex: 100,
    });
  });

  it("左右のカードは内側へ傾けて奥へ下げ、左右で向きを反対にする", () => {
    expect(coverflowLayout(1).transform).toBe("translateX(300px) translateZ(-220px) rotateY(-50deg)");
    expect(coverflowLayout(-2).transform).toBe("translateX(-430px) translateZ(-300px) rotateY(50deg)");
  });

  it("左右3枚までは不透明のまま奥ほどもやを濃くし、その外側は消す", () => {
    expect(coverflowLayout(3).opacity).toBe(1);
    expect(coverflowLayout(3).fog).toBeCloseTo(0.6);
    expect(coverflowLayout(1).fog).toBeLessThan(coverflowLayout(2).fog);
    expect(coverflowLayout(4).opacity).toBe(0);
  });

  it("正面に近いカードほど上に重ねる", () => {
    expect(coverflowLayout(1).zIndex).toBeGreaterThan(coverflowLayout(2).zIndex);
    expect(coverflowLayout(-1).zIndex).toBe(coverflowLayout(1).zIndex);
  });
});
