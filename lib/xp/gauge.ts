import { levelThresholds, XP_PER_LEVEL } from "./compute-level";

export type XpState = { xp: number; level: number };

/** 今のレベルの中で、XPのゲージがどこまで満ちているか（0〜1）。 */
export function gaugeProgress({ xp, level }: XpState): number {
  const { prev } = levelThresholds(level);
  return Math.min(1, Math.max(0, (xp - prev) / XP_PER_LEVEL));
}

/**
 * XPが増えたときに、ゲージを順に動かす先（0〜1）の並び。レベルが上がるときは、いったん満タン（1）まで満たしてから
 * 0 に戻して次のレベルを満たす（XP繰り上がり）。1 の次の 0 は、動かさずにすぐ戻す合図として使う。
 */
export function gaugeSteps(from: XpState, to: XpState): number[] {
  const levels = to.level - from.level;
  if (levels <= 0) return [gaugeProgress(to)];
  const steps: number[] = [];
  for (let i = 0; i < levels; i++) steps.push(1, 0);
  steps.push(gaugeProgress(to));
  return steps;
}
