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

export type MultiKey = "interests" | "strengths" | "values";
export type TextKey = Exclude<keyof Answers, MultiKey>;
export type Question =
  | { kind: "multi"; key: MultiKey; title: string; hint?: string; options: string[] }
  | { kind: "text"; key: TextKey; title: string; hint?: string }
  | { kind: "select"; key: TextKey; title: string; hint?: string; options: string[] };

// 質問と、答えに迷わないためのヒント
export const QUESTIONS: Question[] = [
  {
    kind: "multi",
    key: "interests",
    title: "興味のある領域",
    hint: "あてはまるものをいくつでも選んでください。",
    options: interestOptions,
  },
  {
    kind: "multi",
    key: "strengths",
    title: "強み",
    hint: "あてはまるものをいくつでも選んでください。",
    options: strengthOptions,
  },
  {
    kind: "multi",
    key: "values",
    title: "大事にしたい価値観",
    hint: "あてはまるものをいくつでも選んでください。",
    options: valueOptions,
  },
  {
    kind: "text",
    key: "enjoy",
    title: "好きな業務・没頭できること",
    hint: "時間を忘れて取り組めたことを思い出してみましょう。",
  },
  {
    kind: "text",
    key: "achievements",
    title: "誇りに思う達成",
    hint: "大小は問いません。頑張ったと思えることを書いてください。",
  },
  { kind: "text", key: "dislike", title: "苦手・避けたいこと", hint: "向いていない仕事を知るのも大事です。" },
  { kind: "text", key: "workStyle", title: "働き方の希望", hint: "例：リモート中心、出社多め、チームで働きたい。" },
  { kind: "text", key: "location", title: "希望の勤務地", hint: "例：首都圏、地元に近いところ、こだわらない。" },
  {
    kind: "text",
    key: "industryWish",
    title: "興味のある業界",
    hint: "決まっていなければ、気になる業界を挙げるだけで大丈夫です。",
  },
  { kind: "text", key: "roleWish", title: "興味のある職種", hint: "例：エンジニア、営業、企画。" },
  {
    kind: "select",
    key: "mbti",
    title: "MBTIタイプ（任意）",
    hint: "分かっていれば選んでください。",
    options: mbtiOptions,
  },
  { kind: "text", key: "otherNotes", title: "補足メモ", hint: "ほかに伝えておきたいことがあれば書いてください。" },
];
