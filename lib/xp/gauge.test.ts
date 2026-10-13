import { describe, expect, it } from "vitest";

import { gaugeProgress, gaugeSteps } from "./gauge";

describe("gaugeProgress", () => {
  it("今のレベルの中で満ちている割合を返す", () => {
    expect(gaugeProgress({ xp: 30, level: 2 })).toBe(0.2);
    expect(gaugeProgress({ xp: 25, level: 2 })).toBe(0);
  });
});

describe("gaugeSteps", () => {
  it("同じレベルの中で増えたら、新しい割合まで満たすだけ", () => {
    expect(gaugeSteps({ xp: 30, level: 2 }, { xp: 40, level: 2 })).toEqual([0.6]);
  });

  it("レベルが上がったら、満タンにしてから0に戻し、新しい割合まで満たす", () => {
    expect(gaugeSteps({ xp: 40, level: 2 }, { xp: 55, level: 3 })).toEqual([1, 0, 0.2]);
  });

  it("一度に2つ上がったら、満タンと0を2回くり返す", () => {
    expect(gaugeSteps({ xp: 20, level: 1 }, { xp: 70, level: 3 })).toEqual([1, 0, 1, 0, 0.8]);
  });
});
