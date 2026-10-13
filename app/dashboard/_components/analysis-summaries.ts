import type { Company } from "@/lib/api/companies";
import { sanitizeMarkdown } from "@/app/_components/ai-result/sanitize";

// 一覧のAPIは更新日時の新しい順に返すので、並べ替えずに絞り込むだけで新しい順になる
type AnalysisTarget = Pick<Company, "aiResult">;

/** まだAI企業分析をしていない企業を、新しい順に。 */
export function pendingAnalyses<T extends AnalysisTarget>(companies: T[]): T[] {
  return companies.filter((c) => c.aiResult === null);
}

/** AI企業分析をした企業を、新しい順に。 */
export function recentAnalyses<T extends AnalysisTarget>(companies: T[]): T[] {
  return companies.filter((c) => c.aiResult !== null);
}

/** 分析結果の冒頭を、改行や記号を除いた1続きの文にして length 文字まで見せる。 */
export function analysisPreview(text: string, length: number): string {
  const flat = sanitizeMarkdown(text).replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}
