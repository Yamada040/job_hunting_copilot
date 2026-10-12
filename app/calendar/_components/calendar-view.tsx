"use client";

import { useCalendarItems } from "@/lib/api/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { toCalendarEvent } from "./calendar/types";
import { InteractiveCalendar } from "./interactive-calendar";

export function CalendarView() {
  const { data, error } = useCalendarItems();

  if (error) return <ApiErrorMessage error={error} />;
  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle>
          <h2 className="text-base font-semibold">予定と締切</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          ES / 面接 / インターン
        </div>
        <Card variant="muted" className="rounded-2xl px-3 shadow-inner">
          <InteractiveCalendar events={(data ?? []).map(toCalendarEvent)} />
        </Card>
      </CardContent>
    </Card>
  );
}
