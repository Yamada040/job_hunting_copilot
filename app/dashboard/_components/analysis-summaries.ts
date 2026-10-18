import type { CompanyListItem } from "@/lib/api/companies";
import { sanitizeMarkdown } from "@/app/_components/ai-result/sanitize";

// 一覧のAPIは更新日時の新しい順に返すので、並べ替えずに絞り込むだけで新しい順になる
type AnalysisTarget = Pick<CompanyListItem, "aiResultPreview">;

/** まだAI企業分析をしていない企業を、新しい順に。 */
export function pendingAnalyses<T extends AnalysisTarget>(companies: T[]): T[] {
  return companies.filter((c) => c.aiResultPreview === null);
}

/** AI企業分析をした企業を、新しい順に。 */
export function recentAnalyses<T extends AnalysisTarget>(companies: T[]): T[] {
  return companies.filter((c) => c.aiResultPreview !== null);
}

/** 分析結果の冒頭を、改行や記号を除いた1続きの文にして length 文字まで見せる。 */
export function analysisPreview(text: string, length: number): string {
  const flat = sanitizeMarkdown(text).replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}

/** 1ページに出す件数 */
export const PAGE_SIZE = 2;

/** page ページ目（0始まり）の項目。分析が終わって件数が減ったときに空のページを出さないよう、page は最後のページまでに収める。 */
export function pageOf<T>(items: T[], page: number): { items: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  return { items: items.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE), page: current, pageCount };
}
