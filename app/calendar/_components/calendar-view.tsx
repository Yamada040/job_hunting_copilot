"use client";

import { useCalendarItems } from "@/lib/api/calendar";
import { Card } from "@/components/ui/card";
import { LoadError } from "@/app/_components/load-error";
import { toCalendarEvent } from "./calendar/types";
import { InteractiveCalendar } from "./interactive-calendar";

export function CalendarView() {
  const { data, error } = useCalendarItems();

  if (error) return <LoadError error={error} />;
  // 読み込み中も同じ形の空の月の表を出す（読み込み後に配置がずれないため）
  return (
    <Card className="px-3 py-4 sm:px-6 sm:py-6">
      <InteractiveCalendar events={(data ?? []).map(toCalendarEvent)} />
    </Card>
  );
}
