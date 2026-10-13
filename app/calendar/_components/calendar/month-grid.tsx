import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TYPE_COLOR, TYPE_LABEL } from "./constants";
import { CalendarDayCell, CalendarEvent } from "./types";
import { previewDayEvents } from "./utils";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
// 1日の枠に名前まで出す予定の数（広い画面）と、色の点で出す予定の数（狭い画面）。それより多い分は件数で出す
const MAX_CHIPS = 2;
const MAX_DOTS = 4;

type Props = {
  currentMonth: Date;
  monthDays: CalendarDayCell[];
  todayKey: string;
  /** 日付（YYYY-MM-DD）ごとの予定 */
  eventsByDate: Record<string, CalendarEvent[]>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onAddToday: () => void;
  onSelectDate: (date: string) => void;
};

export function MonthGrid({
  currentMonth,
  monthDays,
  todayKey,
  eventsByDate,
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

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {monthDays.map(({ date, inCurrentMonth }) => {
          const jsDate = new Date(date);
          const weekday = jsDate.getDay();
          const events = eventsByDate[date] ?? [];
          const chips = previewDayEvents(events, MAX_CHIPS);
          const dots = previewDayEvents(events, MAX_DOTS);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-label={`${jsDate.getMonth() + 1}月${jsDate.getDate()}日${events.length > 0 ? `、予定${events.length}件` : ""}`}
              className={cn(
                "flex min-h-16 flex-col items-stretch gap-1 rounded-lg border bg-card p-1 text-left shadow-sm transition hover:bg-accent sm:min-h-24 sm:p-1.5",
                !inCurrentMonth && "border-dashed opacity-60",
                date === todayKey && "border-2 border-ring ring-1 ring-ring/70",
              )}
            >
              <span
                className={cn(
                  "text-center text-xs font-bold sm:text-left sm:text-sm",
                  !inCurrentMonth && "text-muted-foreground",
                  weekday === 0 && "text-sunday",
                  weekday === 6 && "text-saturday",
                )}
              >
                {jsDate.getDate()}
              </span>
              {/* 広い画面: 予定の名前を種類の色の帯で出す */}
              <span className="hidden flex-col gap-0.5 sm:flex">
                {chips.shown.map((event) => (
                  <span
                    key={event.id}
                    className={cn(
                      "truncate rounded border-l-2 px-1 py-0.5 text-[11px] leading-tight font-semibold text-foreground",
                      TYPE_COLOR[event.type].chip,
                    )}
                  >
                    {event.time && <span className="mr-1 tabular-nums">{event.time}</span>}
                    {event.title}
                  </span>
                ))}
                {chips.rest > 0 && <span className="px-1 text-[11px] text-muted-foreground">+{chips.rest}件</span>}
              </span>
              {/* 狭い画面: 名前は入らないので、種類の色の点だけを出す */}
              {events.length > 0 && (
                <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {dots.shown.map((event) => (
                    <span key={event.id} className={cn("h-1.5 w-1.5 rounded-full", TYPE_COLOR[event.type].dot)} />
                  ))}
                  {dots.rest > 0 && <span className="text-[9px] leading-none text-muted-foreground">+</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(Object.keys(TYPE_LABEL) as CalendarEvent["type"][]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", TYPE_COLOR[type].dot)} />
            {TYPE_LABEL[type]}
          </span>
        ))}
      </div>
    </>
  );
}
