import type { CalendarItem } from "@/lib/api/calendar";
import type { EsEntry } from "@/lib/api/es";
import type { InterviewLog } from "@/lib/api/interviews";
import type { XpLog } from "@/lib/api/xp";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";

const DAY = 24 * 60 * 60 * 1000;

/** date（YYYY-MM-DD）が today（YYYY-MM-DD）の何日後か。過去なら負の数。夏時間などに左右されないよう UTC の日付として比べる。 */
export function daysFrom(today: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
}

/** 締切まで withinDays 日以内（今日を含む）の下書きのES。締切を過ぎたものは数えない。 */
export function urgentDrafts(entries: Pick<EsEntry, "status" | "deadline">[], today: string, withinDays = 3) {
  return entries.filter((e) => {
    if (e.status !== "draft" || !e.deadline) return false;
    const days = daysFrom(today, e.deadline);
    return days >= 0 && days <= withinDays;
  });
}

/** AI振り返りをまだしていない面接ログ。 */
export function unreviewedInterviews(logs: Pick<InterviewLog, "aiResult">[]) {
  return logs.filter((log) => log.aiResult === null);
}

/** 今日から withinDays 日以内の予定（ESの締切を含む）を、日付の早い順に並べる。 */
export function upcomingEvents<T extends Pick<CalendarItem, "date" | "time">>(
  items: T[],
  today: string,
  withinDays = 7,
) {
  return items
    .filter((item) => {
      const days = daysFrom(today, item.date);
      return days >= 0 && days <= withinDays;
    })
    .sort((a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
}

/** 今日（端末の日付）に獲得したXPの合計。 */
export function todayXp(logs: Pick<XpLog, "xp" | "createdAt">[], today: string) {
  return logs.filter((log) => formatDateKey(log.createdAt) === today).reduce((sum, log) => sum + log.xp, 0);
}
