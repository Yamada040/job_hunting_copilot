/** ESの文字数。改行は数えず、絵文字などのサロゲートペアも1文字として数える（バックエンドのAI添削への指示と同じ数え方）。 */
export function countCharacters(text: string): number {
  return Array.from(text.replace(/\r?\n/g, "")).length;
}

/**
 * AI添削の修正版が収まるべき文字数の範囲。上限の9割以上を埋めるのがESの目安なので、その範囲を指示している
 * （backend/internal/es/review.go の reviewInput と同じ計算）。
 */
export function rewriteRange(charLimit: number): { min: number; max: number } {
  return { min: Math.ceil(charLimit * 0.9), max: charLimit };
}
