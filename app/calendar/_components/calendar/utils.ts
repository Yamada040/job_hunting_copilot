import type { CalendarDayCell } from "./types";

function toSafeDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function formatDateKey(dateLike: unknown) {
  const date = toSafeDate(dateLike);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 予定を時刻の早い順に並べる。時刻の無いもの（ESの締切など）は、その日の最後に回す。 */
export function sortByTime<T extends { time?: string | null }>(events: T[]): T[] {
  return events.slice().sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

/** 月の表の1日に出す予定。max 件までを時刻順に出し、残りは件数だけ返す。 */
export function previewDayEvents<T extends { time?: string | null }>(events: T[], max: number) {
  const sorted = sortByTime(events);
  return { shown: sorted.slice(0, max), rest: Math.max(0, sorted.length - max) };
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 日付（YYYY-MM-DD）を「10月13日（火）」の形にする。 */
export function formatDayLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return `${month}月${day}日（${WEEKDAY_LABELS[weekday]}）`;
}

/** 月の表に並べる日付。月の1日がある週の日曜から、月末がある週の土曜まで（前後の月の日も含める）。 */
export function monthCells(month: Date): CalendarDayCell[] {
  const year = month.getFullYear();
  const index = month.getMonth();
  const first = new Date(year, index, 1);
  const last = new Date(year, index + 1, 0);
  const start = new Date(year, index, 1 - first.getDay());
  const end = new Date(year, index, last.getDate() + (6 - last.getDay()));
  const cells: CalendarDayCell[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    cells.push({ date: formatDateKey(d), inCurrentMonth: d.getMonth() === index });
  }
  return cells;
}

/** 予定を日付ごとに分ける。何日か続く予定（インターンなど）は、初日から最終日までの毎日に入れる。 */
export function groupByDate<T extends { date: string; endDate?: string | null }>(events: T[]) {
  const byDate: Record<string, T[]> = {};
  for (const event of events) {
    const [year, month, day] = event.date.split("-").map(Number);
    const last = event.endDate && event.endDate > event.date ? event.endDate : event.date;
    for (let d = new Date(year, month - 1, day); formatDateKey(d) <= last; d.setDate(d.getDate() + 1)) {
      (byDate[formatDateKey(d)] ??= []).push(event);
    }
  }
  return byDate;
}

/** 予定が from 〜 to（どちらも含む）に少しでも重なるか。 */
export function overlaps(event: { date: string; endDate?: string | null }, from: string, to: string) {
  return (event.endDate ?? event.date) >= from && event.date <= to;
}
