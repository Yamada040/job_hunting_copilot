"use client";

import { useUpcomingCalendarItems } from "@/lib/api/calendar";
import { useEsEntries } from "@/lib/api/es";
import { useInterviewLogs } from "@/lib/api/interviews";
import { useXpLogs } from "@/lib/api/xp";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";
import { PendingAnalyses } from "./pending-analyses";
import { QuickAnalysis } from "./quick-analysis";
import { RecentAnalyses } from "./recent-analyses";
import { MenuCarousel } from "./menu-carousel";
import { useMenuItems } from "./menu-items";
import { todayXp, unreviewedInterviews, upcomingEvents, urgentDrafts } from "./menu-summaries";
import { avatarMessages } from "./avatar-messages";
import { UpcomingEvents } from "./upcoming-events";

/** ダッシュボードの本体。AI企業分析の入口と、カルーセル・直近の予定を置く。 */
export function DashboardView() {
  const today = formatDateKey(new Date());
  const items = useMenuItems(today);
  const { data: xpLogs } = useXpLogs();
  const earned = xpLogs ? todayXp(xpLogs, new Date()) : null;
  // 一覧の取得は各画面・カルーセルと同じキャッシュを使うので、通信は増えない
  const { data: es } = useEsEntries();
  const { data: interviews } = useInterviewLogs();
  const { data: calendar } = useUpcomingCalendarItems(today);
  const messages = avatarMessages({
    today,
    upcoming: calendar ? upcomingEvents(calendar, today) : [],
    urgentDrafts: es ? urgentDrafts(es, today).length : 0,
    unreviewedInterviews: interviews ? unreviewedInterviews(interviews).length : 0,
    earnedToday: earned ?? 0,
  });

  return (
    // 広い画面では見出しの左右にAI企業分析のパネルを置き、狭い画面ではカルーセルを先に見せてその下へ回す
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 [grid-template-areas:'hero'_'carousel'_'pending'_'recent'_'events'] md:grid-cols-2 md:[grid-template-areas:'hero_hero'_'carousel_carousel'_'pending_recent'_'events_events'] xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_minmax(0,19rem)] xl:[grid-template-areas:'pending_hero_recent'_'carousel_carousel_carousel'_'events_events_events']">
      <div className="space-y-1 pt-10 text-center [grid-area:hero] xl:pt-6">
        <h1 className="text-xl font-bold text-balance">今日は何から進めますか？</h1>
        <p className="text-sm text-muted-foreground">
          {earned === null || earned === 0 ? "まだ今日のXPはありません" : `今日の獲得 +${earned} XP`}
        </p>
        <div className="flex justify-center px-4 pt-4">
          <QuickAnalysis />
        </div>
      </div>
      <PendingAnalyses className="self-start [grid-area:pending]" />
      <RecentAnalyses className="self-start [grid-area:recent]" />
      <div className="min-w-0 [grid-area:carousel]">
        <MenuCarousel items={items} avatarMessages={messages} />
      </div>
      <div className="min-w-0 [grid-area:events]">
        <UpcomingEvents today={today} />
      </div>
    </div>
  );
}
