import type { CompanyStage } from "@/lib/api/companies";

/** 選考状況の表示名。API（DBのenum）は英語のコードで持ち、日本語はここだけに置く（docs/backend-design.md 4章）。 */
export const COMPANY_STAGE_LABELS: Record<CompanyStage, string> = {
  not_entered: "未エントリー",
  entered: "エントリー済み",
  screening: "書類選考",
  interviewing: "面接中",
  offered: "内定",
  rejected: "不合格",
  declined: "辞退",
};

/** 選考の進み具合の順。選択肢や絞り込みはこの順に並べる。 */
export const COMPANY_STAGES = Object.keys(COMPANY_STAGE_LABELS) as CompanyStage[];
