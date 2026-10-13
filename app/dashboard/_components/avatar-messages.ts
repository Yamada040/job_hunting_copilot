import type { CalendarItem } from "@/lib/api/calendar";
import { daysFrom } from "./menu-summaries";

export type AvatarSituation = {
  today: string;
  /** 7日以内の予定（早い順） */
  upcoming: Pick<CalendarItem, "title" | "date">[];
  /** 締切まで3日以内の下書きESの件数 */
  urgentDrafts: number;
  /** 振り返りをしていない面接ログの件数 */
  unreviewedInterviews: number;
  /** 今日獲得したXP */
  earnedToday: number;
};

// 状況から言うことが無いときの一言
const GREETINGS = ["今日もいっしょにがんばろう", "気になる企業はあった？", "少しずつでも前に進もう"];

/** アバターの吹き出しの一言。急ぎのものほど先に並べ、最後にあいさつを足す。 */
export function avatarMessages(s: AvatarSituation): string[] {
  const messages: string[] = [];
  const next = s.upcoming[0];
  if (next) {
    const days = daysFrom(s.today, next.date);
    if (days <= 0) messages.push(`今日は「${next.title}」があるよ！`);
    else if (days === 1) messages.push(`明日は「${next.title}」。準備しておこう`);
  }
  if (s.urgentDrafts > 0) messages.push(`締切が近いESが${s.urgentDrafts}件あるよ`);
  if (s.unreviewedInterviews > 0) messages.push(`面接の振り返りが${s.unreviewedInterviews}件待ってるよ`);
  if (s.earnedToday > 0) messages.push(`今日は +${s.earnedToday} XP！いい調子`);
  return [...messages, ...GREETINGS];
}
