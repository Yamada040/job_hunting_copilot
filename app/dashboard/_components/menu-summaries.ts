import { UPCOMING_DAYS, type CalendarItem } from "@/lib/api/calendar";
import type { EsEntrySummary } from "@/lib/api/es";
import type { InterviewLogSummary } from "@/lib/api/interviews";
import type { XpLog } from "@/lib/api/xp";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";

const DAY = 24 * 60 * 60 * 1000;

/** date（YYYY-MM-DD）が today（YYYY-MM-DD）の何日後か。過去なら負の数。夏時間などに左右されないよう UTC の日付として比べる。 */
export function daysFrom(today: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
}

/** 締切まで withinDays 日以内（今日を含む）の下書きのES。締切を過ぎたものは数えない。 */
export function urgentDrafts(entries: Pick<EsEntrySummary, "status" | "deadline">[], today: string, withinDays = 3) {
  return entries.filter((e) => {
    if (e.status !== "draft" || !e.deadline) return false;
    const days = daysFrom(today, e.deadline);
    return days >= 0 && days <= withinDays;
  });
}

/** AI振り返りをまだしていない面接ログ。 */
export function unreviewedInterviews<T extends Pick<InterviewLogSummary, "reviewed">>(logs: T[]): T[] {
  return logs.filter((log) => !log.reviewed);
}

/**
 * 今日から withinDays 日以内の予定（ESの締切を含む）を、日付の早い順に並べる。
 * 何日か続く予定（インターンなど）は、もう始まっていても最終日が今日以降なら含め、今日の予定として並べる。
 */
export function upcomingEvents<T extends Pick<CalendarItem, "date" | "time"> & { endDate?: string | null }>(
  items: T[],
  today: string,
  withinDays = UPCOMING_DAYS,
) {
  const sortKey = (item: T) => `${item.date < today ? today : item.date} ${item.time ?? ""}`;
  return items
    .filter((item) => daysFrom(today, item.date) <= withinDays && daysFrom(today, item.endDate ?? item.date) >= 0)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

/** 今日（端末の日付）に獲得したXPの合計。 */
export function todayXp(logs: Pick<XpLog, "xp" | "createdAt">[], today: string) {
  return logs.filter((log) => formatDateKey(log.createdAt) === today).reduce((sum, log) => sum + log.xp, 0);
}

/** 予定の日が今日から見ていつか。今日・明日、それ以降は「○日後」。 */
export function relativeDay(today: string, date: string): string {
  const days = daysFrom(today, date);
  // もう始まっている何日か続く予定も、今日の予定として言う
  if (days <= 0) return "今日";
  if (days === 1) return "明日";
  return `${days}日後`;
}
