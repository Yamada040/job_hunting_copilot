"use client";

import { useCalendarItems } from "@/lib/api/calendar";
import { useEsEntries } from "@/lib/api/es";
import { useInterviewLogs } from "@/lib/api/interviews";
import { useXpLogs } from "@/lib/api/xp";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";
import { MenuCarousel } from "./menu-carousel";
import { useMenuItems } from "./menu-items";
import { todayXp, unreviewedInterviews, upcomingEvents, urgentDrafts } from "./menu-summaries";
import { avatarMessages } from "./avatar-messages";
import { UpcomingEvents } from "./upcoming-events";

/** ダッシュボードの本体。カルーセルと直近の予定を置き、必要になった情報を足していく。 */
export function DashboardView() {
  const today = formatDateKey(new Date());
  const items = useMenuItems(today);
  const { data: xpLogs } = useXpLogs();
  const earned = xpLogs ? todayXp(xpLogs, today) : null;
  // 一覧の取得は各画面・カルーセルと同じキャッシュを使うので、通信は増えない
  const { data: es } = useEsEntries();
  const { data: interviews } = useInterviewLogs();
  const { data: calendar } = useCalendarItems();
  const messages = avatarMessages({
    today,
    upcoming: calendar ? upcomingEvents(calendar, today) : [],
    urgentDrafts: es ? urgentDrafts(es, today).length : 0,
    unreviewedInterviews: interviews ? unreviewedInterviews(interviews).length : 0,
    earnedToday: earned ?? 0,
  });

  return (
    <>
      <div className="space-y-1 pt-10 text-center">
        <h1 className="text-xl font-bold text-balance">今日は何から進めますか？</h1>
        <p className="text-sm text-muted-foreground">
          {earned === null || earned === 0 ? "まだ今日のXPはありません" : `今日の獲得 +${earned} XP`}
        </p>
      </div>
      <MenuCarousel items={items} avatarMessages={messages} />
      <UpcomingEvents today={today} />
    </>
  );
}
