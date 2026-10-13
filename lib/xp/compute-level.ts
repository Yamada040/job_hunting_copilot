// レベル計算の単一ソース。Level 1 が 0xp、25xp ごとに +1 レベル。
export const XP_PER_LEVEL = 25;

export function computeLevel(xp: number) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

// 指定レベルの開始 XP / 次レベルに必要な XP（プログレスバー用）
export function levelThresholds(level: number) {
  return {
    prev: Math.max(0, (level - 1) * XP_PER_LEVEL),
    next: level * XP_PER_LEVEL,
  };
}
