import type { CalendarItem } from "@/lib/api/calendar";
import type { Company } from "@/lib/api/companies";
import type { EsEntrySummary } from "@/lib/api/es";
import type { InterviewLogSummary } from "@/lib/api/interviews";
import {
  relativeDay,
  unreviewedInterviews,
  upcomingEvents,
  urgentDrafts,
} from "@/app/dashboard/_components/menu-summaries";

// 各画面の見出しの横のアバター（AvatarGuide）が話す一言。一覧の画面はデータから急ぎのものを先に話し、
// 入力の画面は使い方のひとことを話す。

/** 入力や確認の画面で話す、使い方のひとこと。 */
export const GUIDE_TIPS = {
  companyNew: ["企業名だけでも登録できるよ", "マイページのURLを入れると、一覧からすぐ開けるよ"],
  companyDetail: ["選考が進んだら、選考状況を更新しよう", "AI企業分析は企業ごとに1回できるよ"],
  esNew: ["まずは企業とタイトルだけでOK", "設問ごとに書くと、AIが設問ごとに添削できるよ"],
  esDetail: ["保存してから、AI添削を試してみよう", "締切を入れると、カレンダーに出るよ"],
  interviewNew: ["覚えているうちに、聞かれたことをメモしよう", "うまく答えられなかったことも残しておこう"],
  interviewDetail: ["AI振り返りで、次の面接に活かそう", "改善点を書いておくと、振り返りが深まるよ"],
  webtestNew: ["苦手な分野の問題を作ってみよう", "解説も書いておくと、見直しやすいよ"],
  webtestDetail: ["制限時間を意識して解いてみよう", "間違えたら、解説を読み直そう"],
  selfAnalysis: ["思いつくままに書いて大丈夫", "答えると、AI自己分析ができるよ"],
  aptitude: ["直感で選んでみよう", "答えると、AI診断ができるよ"],
  profile: ["目標を書いておくと、続けやすいよ"],
  contact: ["困ったことや、ほしい機能を教えてね"],
  developer: ["今週の使われ方を見てみよう"],
} satisfies Record<string, string[]>;

/** ES一覧で話す一言。締切が近い下書きを先に話す。 */
export function esListMessages(entries: Pick<EsEntrySummary, "status" | "deadline">[], today: string): string[] {
  if (entries.length === 0) return ["最初のESを作ってみよう"];
  const messages: string[] = [];
  const urgent = urgentDrafts(entries, today).length;
  if (urgent > 0) messages.push(`締切が近いESが${urgent}件あるよ`);
  const drafts = entries.filter((e) => e.status === "draft").length;
  if (drafts > 0) messages.push(`下書きが${drafts}件。少しずつ仕上げよう`);
  return [...messages, "提出すると、XPがもらえるよ"];
}

/** 企業一覧で話す一言。選考が進んでいる企業を先に話す。 */
export function companyListMessages(companies: Pick<Company, "stage">[]): string[] {
  if (companies.length === 0) return ["気になる企業を登録してみよう"];
  const messages: string[] = [];
  const interviewing = companies.filter((c) => c.stage === "interviewing").length;
  if (interviewing > 0) messages.push(`面接中の企業が${interviewing}社あるよ`);
  const offered = companies.filter((c) => c.stage === "offered").length;
  if (offered > 0) messages.push(`内定が${offered}社！おめでとう`);
  return [...messages, `${companies.length}社を管理中`, "お気に入りで絞り込めるよ"];
}

/** 面接ログ一覧で話す一言。振り返りをしていないログを先に話す。 */
export function interviewListMessages(logs: Pick<InterviewLogSummary, "reviewed">[]): string[] {
  if (logs.length === 0) return ["面接が終わったら、ログを残そう"];
  const unreviewed = unreviewedInterviews(logs).length;
  const messages = unreviewed > 0 ? [`振り返りが${unreviewed}件待ってるよ`] : ["振り返りはばっちり！"];
  return [...messages, "ログを作ると、XPがもらえるよ"];
}

/** カレンダーで話す一言。7日以内の直近の予定を先に話す。 */
export function calendarMessages(items: Pick<CalendarItem, "title" | "date" | "time">[], today: string): string[] {
  const next = upcomingEvents(items, today)[0];
  const messages = next
    ? [`${relativeDay(today, next.date)}は「${next.title}」があるよ`]
    : ["1週間の予定は空いているよ"];
  return [...messages, "日付を押すと、予定を追加できるよ", "Googleカレンダーにも出せるよ"];
}

/** Webテスト一覧で話す一言。 */
export function webtestListMessages(questionCount: number): string[] {
  if (questionCount === 0) return ["最初の問題を作ってみよう"];
  return [`${questionCount}問そろっているよ`, "解くと、XPがもらえるよ"];
}
