"use client";

import { useUpcomingCalendarItems } from "@/lib/api/calendar";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { calendarMessages } from "@/app/_components/avatar/guide-messages";

/** カレンダーの見出しの横のアバター。カレンダーの今日と今週の予定と同じキャッシュを読むので、通信は増えない。 */
export function CalendarGuide() {
  const today = formatDateKey(new Date());
  const { data } = useUpcomingCalendarItems(today);
  return <AvatarGuide messages={data ? calendarMessages(data, today) : []} />;
}
