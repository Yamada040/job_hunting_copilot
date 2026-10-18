"use client";

import { useMemo, useState } from "react";

import { useCalendarItems, useUpcomingCalendarItems } from "@/lib/api/calendar";
import { Card } from "@/components/ui/card";
import { LoadError } from "@/app/_components/load-error";
import { toCalendarEvent, type CalendarEvent } from "./calendar/types";
import { formatDateKey, monthCells } from "./calendar/utils";
import { InteractiveCalendar } from "./interactive-calendar";

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const today = formatDateKey(new Date());
  const cells = monthCells(currentMonth);
  // 月の表には表示している月の分を、今日と今週の予定には直近の分を取る（別の月を見ていても今週の予定は出し続ける）
  const month = useCalendarItems({ from: cells[0].date, to: cells[cells.length - 1].date });
  const upcoming = useUpcomingCalendarItems(today);

  const events = useMemo(() => {
    const byId = new Map<string, CalendarEvent>();
    for (const item of [...(month.data ?? []), ...(upcoming.data ?? [])]) {
      const event = toCalendarEvent(item);
      byId.set(event.id, event);
    }
    return [...byId.values()];
  }, [month.data, upcoming.data]);

  const error = month.error ?? upcoming.error;
  if (error) return <LoadError error={error} />;
  // 読み込み中も同じ形の空の月の表を出す（読み込み後に配置がずれないため）
  return (
    <Card className="px-3 py-4 sm:px-6 sm:py-6">
      <InteractiveCalendar events={events} currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
    </Card>
  );
}
