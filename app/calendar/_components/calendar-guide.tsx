"use client";

import { useCalendarItems } from "@/lib/api/calendar";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { calendarMessages } from "@/app/_components/avatar/guide-messages";

/** カレンダーの見出しの横のアバター。一覧と同じキャッシュを読むので、通信は増えない。 */
export function CalendarGuide() {
  const { data } = useCalendarItems();
  const today = formatDateKey(new Date());
  return <AvatarGuide messages={data ? calendarMessages(data, today) : []} />;
}
