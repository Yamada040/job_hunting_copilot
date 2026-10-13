import type { CalendarItem } from "@/lib/api/calendar";
import type { CompanySummary } from "@/lib/api/companies";

/** カレンダーに表示する1件。ESの締切は id を "es-<ESのID>" にして、ユーザーの予定と区別する。 */
export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  /** 何日か続く予定（インターンなど）の最終日。null なら1日だけ */
  endDate?: string | null;
  title: string;
  company?: string | null;
  companyId?: string | null;
  type: CalendarItem["type"];
  time?: string | null; // HH:MM
  /** リンク（オンライン面接のURLなど） */
  url?: string | null;
};

export type CalendarFormState = {
  title: string;
  company: CompanySummary | null;
  type: CalendarEvent["type"];
  /** 終日の予定か。終日なら時刻を入れず、インターンなら期間（最終日）を選べる */
  allDay: boolean;
  time: string;
  endDate: string;
  url: string;
};

/** バックエンドが返すカレンダーの1件を、画面で扱う形にする。 */
export function toCalendarEvent(item: CalendarItem): CalendarEvent {
  return {
    id: item.source === "es_deadline" ? `es-${item.id}` : item.id,
    date: item.date,
    endDate: item.endDate,
    title: item.title,
    company: item.company?.name ?? null,
    companyId: item.company?.id ?? null,
    type: item.type,
    time: item.time,
    url: item.url,
  };
}

export type CalendarDayCell = {
  date: string;
  inCurrentMonth: boolean;
};
