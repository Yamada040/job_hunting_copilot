import { Answers } from "../types";

export const interestOptions = [
  "SaaS/プロダクト開発",
  "コンサルティング",
  "金融/Fintech",
  "人事/HR",
  "マーケ/PR",
  "メディア/コンテンツ",
  "ヘルスケア/医療",
  "ゲーム/エンタメ",
  "公共/教育",
  "製造/モノづくり",
  "物流/EC",
  "スタートアップ/新規事業",
  "グローバル/海外",
];

export const strengthOptions = [
  "論理思考・問題解決",
  "チーム牽引",
  "コミュニケーション/折衝",
  "リーダーシップ/推進力",
  "探究心・学習意欲",
  "プロジェクトマネジメント",
  "クリエイティブ/企画",
  "技術・プログラミング",
  "営業力・交渉力",
  "語学/異文化対応",
];

export const valueOptions = [
  "裁量・意思決定",
  "安定性",
  "社会貢献/インパクト",
  "報酬",
  "成長スピード",
  "ワークライフバランス",
  "リモート/柔軟性",
  "チームワーク",
  "専門性の深化",
  "グローバル環境",
];

export const mbtiOptions = [
  "ISTJ",
  "ISFJ",
  "INFJ",
  "INTJ",
  "ISTP",
  "ISFP",
  "INFP",
  "INTP",
  "ESTP",
  "ESFP",
  "ENFP",
  "ENTP",
  "ESTJ",
  "ESFJ",
  "ENFJ",
  "ENTJ",
];

export const defaultAnswers: Answers = {
  interests: [],
  strengths: [],
  values: [],
  enjoy: "",
  achievements: "",
  dislike: "",
  workStyle: "",
  location: "",
  industryWish: "",
  roleWish: "",
  otherNotes: "",
  mbti: "",
};
