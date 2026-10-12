"use client";

import { useXpLogs } from "@/lib/api/xp";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";
import { MenuCarousel } from "./menu-carousel";
import { useMenuItems } from "./menu-items";
import { todayXp } from "./menu-summaries";

/** ダッシュボードの本体。まずはカルーセルだけを置き、必要になった情報を足していく。 */
export function DashboardView() {
  const today = formatDateKey(new Date());
  const items = useMenuItems(today);
  const { data: xpLogs } = useXpLogs();
  const earned = xpLogs ? todayXp(xpLogs, today) : null;

  return (
    <>
      <div className="space-y-1 pt-10 text-center">
        <h1 className="text-xl font-bold text-balance">今日は何から進めますか？</h1>
        <p className="text-sm text-muted-foreground">
          {earned === null || earned === 0 ? "まだ今日のXPはありません" : `今日の獲得 +${earned} XP`}
        </p>
      </div>
      <MenuCarousel items={items} />
    </>
  );
}
