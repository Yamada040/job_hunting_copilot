"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { useUpcomingCalendarItems, type CalendarItem } from "@/lib/api/calendar";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { TYPE_LABEL } from "@/app/calendar/_components/calendar/constants";
import { relativeDay, upcomingEvents } from "./menu-summaries";
import { LinesSkeleton } from "@/app/_components/loading-skeletons";

// ホームに並べる予定の数。これより多いときはカレンダーで見てもらう
const MAX_ITEMS = 5;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 7日以内の予定（ESの締切を含む）。行は上から順に少しずつ現れる
 * （https://motion-reference.takayustudio.jp/#motion=catalog-ui-navigation-staggered-reveal）。
 */
export function UpcomingEvents({ today }: { today: string }) {
  const { data, error } = useUpcomingCalendarItems(today);
  const reduceMotion = useReducedMotion();
  const events = data ? upcomingEvents(data, today) : [];

  return (
    <Card className="mx-auto w-full max-w-3xl gap-3 py-5">
      <CardHeader className="flex items-center justify-between px-6">
        <CardTitle>
          <h2 className="text-base font-semibold">直近の予定</h2>
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.CALENDAR}>カレンダーを開く</Link>
        </Button>
      </CardHeader>
      <CardContent className="px-6">
        <ApiErrorMessage error={error} />
        {!data && !error && <LinesSkeleton />}
        {data && events.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">7日以内の予定はありません。</p>
        )}
        <ul className="divide-y">
          {events.slice(0, MAX_ITEMS).map((event, i) => (
            <motion.li
              key={`${event.source}-${event.id}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            >
              <EventRow event={event} today={today} />
            </motion.li>
          ))}
        </ul>
        {events.length > MAX_ITEMS && (
          <p className="pt-2 text-xs text-muted-foreground">
            ほか {events.length - MAX_ITEMS}件はカレンダーで確認できます。
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EventRow({ event, today }: { event: CalendarItem; today: string }) {
  const date = new Date(`${event.date}T00:00:00`);
  const soon = relativeDay(today, event.date);
  // ESの締切はそのESへ、自分で登録した予定はカレンダーへ
  const href = event.source === "es_deadline" ? ROUTES.ES_DETAIL(event.id) : ROUTES.CALENDAR;

  return (
    <Link href={href} className="flex items-center gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary">
      <span className="w-16 shrink-0 text-center">
        <span
          className={
            soon === "今日" || soon === "明日" ? "block text-sm font-bold text-destructive" : "block text-sm font-bold"
          }
        >
          {soon}
        </span>
        <span className="block text-[11px] text-muted-foreground tabular-nums">
          {date.getMonth() + 1}/{date.getDate()}（{WEEKDAYS[date.getDay()]}）
        </span>
      </span>
      <span className="w-20 shrink-0 rounded-full border bg-secondary py-0.5 text-center text-[11px] font-bold text-secondary-foreground">
        {TYPE_LABEL[event.type]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{event.title}</span>
        {event.company && <span className="block truncate text-xs text-muted-foreground">{event.company.name}</span>}
      </span>
      {event.time && <span className="shrink-0 text-sm font-semibold tabular-nums">{event.time}</span>}
    </Link>
  );
}
