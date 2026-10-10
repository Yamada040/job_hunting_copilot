import type { CalendarItem } from "@/lib/api/calendar";
import type { CompanySummary } from "@/lib/api/companies";

/** カレンダーに表示する1件。ESの締切は id を "es-<ESのID>" にして、ユーザーの予定と区別する。 */
export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  company?: string | null;
  companyId?: string | null;
  type: CalendarItem["type"];
  time?: string | null; // HH:MM
};

export type CalendarFormState = {
  title: string;
  company: CompanySummary | null;
  type: CalendarEvent["type"];
  time: string;
};

/** バックエンドが返すカレンダーの1件を、画面で扱う形にする。 */
export function toCalendarEvent(item: CalendarItem): CalendarEvent {
  return {
    id: item.source === "es_deadline" ? `es-${item.id}` : item.id,
    date: item.date,
    title: item.title,
    company: item.company?.name ?? null,
    companyId: item.company?.id ?? null,
    type: item.type,
    time: item.time,
  };
}

export type CalendarDayCell = {
  date: string;
  inCurrentMonth: boolean;
};
