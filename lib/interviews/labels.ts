import type { InterviewFormat, InterviewRating } from "@/lib/api/interviews";

/** 面接形式の表示名。API（DBのenum）は英語のコードで持ち、日本語はここだけに置く（docs/backend-design.md 4章）。 */
export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  in_person: "対面",
  online: "オンライン",
  hybrid: "ハイブリッド",
};

export const INTERVIEW_RATING_LABELS: Record<InterviewRating, string> = {
  good: "良い",
  average: "普通",
  bad: "悪い",
};
