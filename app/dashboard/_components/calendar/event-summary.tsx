import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarEvent } from "./types";

type Props = {
  title: string;
  events: CalendarEvent[];
  emptyText: string;
  /** 2行目に出す日付・種別などの説明 */
  describe: (event: CalendarEvent) => string;
  onSelect: (event: CalendarEvent) => void;
};

/** 今日・今週の予定の一覧。押すとその予定を編集できる */
export function EventSummary({ title, events, emptyText, describe, onSelect }: Props) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h3 className="text-sm font-bold text-sky-600">{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length > 0 ? (
          events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event)}
              className="group flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-xs font-bold transition hover:text-sky-500"
            >
              <span aria-hidden className="shrink-0 text-[0.7rem] transition-transform group-hover:translate-x-1">
                ▶
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{event.company || event.title}</span>
                <span className="mt-0.5 block text-muted-foreground">{describe(event)}</span>
              </span>
            </button>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}
