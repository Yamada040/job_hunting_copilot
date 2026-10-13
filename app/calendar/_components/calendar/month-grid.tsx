import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDayCell } from "./types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  currentMonth: Date;
  monthDays: CalendarDayCell[];
  todayKey: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onAddToday: () => void;
  onSelectDate: (date: string) => void;
};

export function MonthGrid({
  currentMonth,
  monthDays,
  todayKey,
  onPrevMonth,
  onNextMonth,
  onAddToday,
  onSelectDate,
}: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={onPrevMonth}
            aria-label="前の月へ"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold">
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={onNextMonth}
            aria-label="次の月へ"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>

        <Button type="button" variant="outline" onClick={onAddToday}>
          <PlusIcon className="h-4 w-4" />
          今日に追加
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
        {WEEKDAYS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "rounded-lg border bg-card py-2 shadow-sm",
              index === 0 && "text-sunday",
              index === 6 && "text-saturday",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map(({ date, inCurrentMonth }) => {
          const jsDate = new Date(date);
          const weekday = jsDate.getDay();
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                "h-14 rounded-lg border bg-card text-center text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-accent hover:shadow-md",
                !inCurrentMonth && "border-dashed text-muted-foreground opacity-70",
                date === todayKey && "border-2 border-ring ring-1 ring-ring/70",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-full items-center justify-center",
                  !inCurrentMonth && "opacity-60",
                  weekday === 0 && "text-sunday",
                  weekday === 6 && "text-saturday",
                )}
              >
                {jsDate.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
