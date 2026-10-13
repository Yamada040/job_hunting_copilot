import { describe, expect, it } from "vitest";

import { scenePosition, sceneStyle } from "./depth-scroll";

describe("scenePosition", () => {
  it("1画面ずつ次のセクションへ進む", () => {
    expect(scenePosition(0)).toBe(0);
    expect(scenePosition(1)).toBe(1);
    expect(scenePosition(2.5)).toBeCloseTo(2.5);
  });

  it("セクションの前後では、少しスクロールしても動かさない", () => {
    expect(scenePosition(0.1)).toBe(0);
    expect(scenePosition(0.9)).toBe(1);
  });
});

describe("sceneStyle", () => {
  it("見ているセクションは、そのまま押せる状態で見せる", () => {
    expect(sceneStyle(0)).toEqual({
      transform: "perspective(1200px) translate3d(0px, 0px, 0px) rotateX(0deg)",
      opacity: 1,
      filter: "none",
      interactive: true,
    });
  });

  it("次のセクションは下の奥で上の辺を奥へ倒し、ぼかして薄く見せ、押せないようにする", () => {
    const next = sceneStyle(0.75);
    expect(next.transform).toBe("perspective(1200px) translate3d(0px, 240px, -1050px) rotateX(52.5deg)");
    expect(next.opacity).toBe(0.25);
    expect(next.filter).toBe("blur(4.5px)");
    expect(next.interactive).toBe(false);
  });

  it("通り過ぎたセクションは上へ倒れながら手前へ迫り、半分進んだところで消える", () => {
    expect(sceneStyle(-0.25).transform).toBe("perspective(1200px) translate3d(0px, -80px, 125px) rotateX(-17.5deg)");
    expect(sceneStyle(-0.25).opacity).toBe(0.5);
    expect(sceneStyle(-0.5).opacity).toBe(0);
    expect(sceneStyle(-0.5).interactive).toBe(false);
  });
});
