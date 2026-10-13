"use client";

import { PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TYPE_COLOR } from "./constants";
import type { CalendarEvent } from "./types";
import { formatDayLabel, sortByTime } from "./utils";

/** その日の予定の一覧。月の表の「+N件」や、狭い画面で日付を押したときに出す。予定を押すと詳細を開く。 */
export function DayEvents({
  date,
  events,
  onSelect,
  onAdd,
}: {
  date: string;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <DialogTitle className="text-lg font-semibold">{formatDayLabel(date)}</DialogTitle>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">この日の予定はありません。</p>
      ) : (
        <ul className="space-y-1">
          {sortByTime(events).map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelect(event)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TYPE_COLOR[event.type].dot)} aria-hidden />
                <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">{event.time ?? "終日"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{event.title}</span>
                  {event.company && (
                    <span className="block truncate text-xs text-muted-foreground">{event.company}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" onClick={onAdd}>
        <PlusIcon />
        この日に予定を追加
      </Button>
    </div>
  );
}
