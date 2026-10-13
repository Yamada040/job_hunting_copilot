import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/app/_components/list/use-media-query";
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
  /** 日付の空いたところを押したとき（その日の予定を作る） */
  onCreate: (date: string) => void;
  /** 「+N件」や、狭い画面で予定のある日を押したとき（その日の一覧を出す） */
  onOpenDay: (date: string) => void;
  /** 予定を押したとき（詳細を出す） */
  onOpenEvent: (event: CalendarEvent) => void;
};

export function MonthGrid({
  currentMonth,
  monthDays,
  todayKey,
  eventsByDate,
  onPrevMonth,
  onNextMonth,
  onAddToday,
  onCreate,
  onOpenDay,
  onOpenEvent,
}: Props) {
  // 狭い画面では予定の名前を出せず点だけなので、予定のある日を押したらその日の一覧を出す
  const wide = useMediaQuery("(min-width: 640px)");
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
          const dayLabel = `${jsDate.getMonth() + 1}月${jsDate.getDate()}日`;
          const openDay = !wide && events.length > 0;
          return (
            // Googleカレンダーと同じく、日の空いたところを押すと予定を作り、予定の帯を押すとその予定を開く。
            // ボタンの中にボタンは置けないので、日全体のボタンを下に敷き、帯のボタンをその上に重ねる
            <div
              key={date}
              className={cn(
                "relative flex min-h-16 flex-col gap-1 rounded-lg border bg-card p-1 shadow-sm transition hover:bg-accent sm:min-h-24 sm:p-1.5",
                !inCurrentMonth && "border-dashed opacity-60",
                date === todayKey && "border-2 border-ring ring-1 ring-ring/70",
              )}
            >
              <button
                type="button"
                onClick={() => (openDay ? onOpenDay(date) : onCreate(date))}
                aria-label={openDay ? `${dayLabel}の予定（${events.length}件）を見る` : `${dayLabel}に予定を追加`}
                className="absolute inset-0 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
              <span
                className={cn(
                  "pointer-events-none relative text-center text-xs font-bold sm:text-left sm:text-sm",
                  !inCurrentMonth && "text-muted-foreground",
                  weekday === 0 && "text-sunday",
                  weekday === 6 && "text-saturday",
                )}
              >
                {jsDate.getDate()}
              </span>
              {wide ? (
                <span className="relative flex flex-col gap-0.5">
                  {chips.shown.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onOpenEvent(event)}
                      className={cn(
                        "truncate rounded border-l-2 px-1 py-0.5 text-left text-[11px] leading-tight font-semibold text-foreground transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                        TYPE_COLOR[event.type].chip,
                      )}
                    >
                      {event.time && <span className="mr-1 tabular-nums">{event.time}</span>}
                      {event.title}
                    </button>
                  ))}
                  {chips.rest > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenDay(date)}
                      className="self-start rounded px-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      +{chips.rest}件
                    </button>
                  )}
                </span>
              ) : (
                events.length > 0 && (
                  <span className="pointer-events-none relative flex flex-wrap justify-center gap-0.5" aria-hidden>
                    {dots.shown.map((event) => (
                      <span key={event.id} className={cn("h-1.5 w-1.5 rounded-full", TYPE_COLOR[event.type].dot)} />
                    ))}
                    {dots.rest > 0 && <span className="text-[9px] leading-none text-muted-foreground">+</span>}
                  </span>
                )
              )}
            </div>
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
