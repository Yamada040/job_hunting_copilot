"use client";

import Link from "next/link";

import { useCalendarItems } from "@/lib/api/calendar";
import { useEsEntries } from "@/lib/api/es";
import { useInterviewLogs } from "@/lib/api/interviews";
import { useMe } from "@/lib/api/me";
import { useXpLogs, XP_ACTION_LABELS } from "@/lib/api/xp";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { Card } from "@/components/ui/card";
import { QuestWindow } from "@/app/_components/quest-window";
import { toCalendarEvent } from "./calendar/types";
import { EventListModal } from "./event-list-modal";
import { GoalScroll } from "./goal-scroll";
import { InteractiveCalendar } from "./interactive-calendar";
import { SimpleListModal } from "./simple-list-modal";

/**
 * ダッシュボードの本体。専用のAPIは作らず、一覧系のAPIを組み合わせて表示する。
 * TanStack Query のキャッシュを他の画面と共有でき、画面を移動したときに取り直さずに済むため（docs/backend-design.md 5章）。
 */
export function DashboardView() {
  const { data: me } = useMe();
  const calendar = useCalendarItems();
  const es = useEsEntries({ limit: 12 });
  const interviews = useInterviewLogs();
  const { data: xpLogs } = useXpLogs();

  const error = calendar.error ?? es.error ?? interviews.error;
  if (error) return <ApiErrorMessage error={error} />;

  const calendarEvents = (calendar.data ?? []).map(toCalendarEvent);
  const esEntries = es.data ?? [];
  const interviewLogs = interviews.data ?? [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pendingEs = [...esEntries]
    .filter((es) => es.status !== "submitted" && es.deadline && new Date(es.deadline) >= today)
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  // 面接ログ未記入: 過去の面接イベントで記録が無いものを検出
  const interviewActions = (() => {
    const pastInterviews = calendarEvents.filter((evt) => {
      if (evt.type !== "interview") return false;
      const date = evt.date ? new Date(evt.date) : null;
      return date ? date < today : false;
    });
    const missing = pastInterviews.filter((evt) => {
      const hasLog = interviewLogs.some((log) => log.company.id === evt.companyId && log.interviewDate === evt.date);
      return !hasLog;
    });
    return missing.slice(0, 1).map((evt) => ({
      title: "面接ログを記録",
      subtitle: evt.company || evt.title,
      href: ROUTES.INTERVIEWS,
    }));
  })();

  const nextActions = [
    ...pendingEs.slice(0, 2).map((es) => ({
      title: "ESを進める",
      subtitle: `${es.company.name} / 締切 ${es.deadline ? new Date(es.deadline).toLocaleDateString() : "未設定"}`,
      href: ROUTES.ES_DETAIL(es.id),
    })),
    ...interviewActions,
  ].slice(0, 2);

  const allXpLogs = xpLogs ?? [];
  const recentXpLogs = allXpLogs.slice(0, 5);
  const urgentEvents = calendarEvents
    .filter((evt) => {
      const date = evt.date ? new Date(evt.date) : null;
      if (!date) return false;
      const diff = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7 && (evt.type === "es" || evt.type === "interview");
    })
    .slice(0, 4);

  return (
    <>
      <GoalScroll targetIndustry={me?.targetIndustry} careerAxis={me?.careerAxis} goalState={me?.goalState} />

      {/* カレンダー + サイドカラム */}
      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <QuestWindow title="クエストカレンダー">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            ES / 面接 / インターン
          </div>
          <Card variant="muted" className="rounded-2xl px-3 shadow-inner">
            <InteractiveCalendar events={calendarEvents} />
          </Card>
        </QuestWindow>

        <div className="space-y-6">
          {/* Urgent */}
          <EventListModal
            events={calendarEvents}
            trigger={
              <QuestWindow title="至急クエスト" className="cursor-pointer transition hover:scale-[1.02]">
                <div className="space-y-3">
                  {urgentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="group flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-bold transition hover:text-sky-500"
                    >
                      <span
                        aria-hidden
                        className="shrink-0 text-[0.7rem] transition-transform group-hover:translate-x-1"
                      >
                        ▶
                      </span>
                      <span className="text-sm font-bold">
                        {evt.company || evt.title} ({evt.date})
                      </span>
                    </div>
                  ))}
                  {urgentEvents.length === 0 && (
                    <div className="py-2 text-center text-xs text-muted-foreground">直近の 締切は ないようだ。</div>
                  )}
                </div>
              </QuestWindow>
            }
          />

          {/* Next actions */}
          <SimpleListModal
            trigger={
              <QuestWindow title="次のクエスト" className="cursor-pointer transition hover:scale-[1.02]">
                <div className="space-y-3">
                  {nextActions.map((action) => (
                    <Link
                      key={`${action.title}-${action.href}-${action.subtitle}`}
                      href={action.href}
                      className="group flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-bold transition hover:text-sky-500"
                    >
                      <span
                        aria-hidden
                        className="shrink-0 text-[0.7rem] transition-transform group-hover:translate-x-1"
                      >
                        ▶
                      </span>
                      <span className="text-sm font-bold">{action.subtitle}</span>
                    </Link>
                  ))}
                  {nextActions.length === 0 && (
                    <div className="py-2 text-center text-xs text-muted-foreground">
                      なすべきことは すべて おわった。
                    </div>
                  )}
                </div>
              </QuestWindow>
            }
            items={nextActions.map((action) => ({
              title: action.title,
              subtitle: action.subtitle,
              meta: action.href,
            }))}
            emptyText="アクションはありません。"
          />

          {/* 最近のXP獲得 */}
          <SimpleListModal
            trigger={
              <QuestWindow title="戦歴ログ" className="cursor-pointer transition hover:scale-[1.02]">
                <div className="space-y-2">
                  {recentXpLogs.map((log, idx) => (
                    <div
                      key={`${log.createdAt}-${idx}`}
                      className="flex items-center justify-between gap-2 border-b py-1 transition-colors last:border-0 hover:text-sky-500"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-sky-500">●</span>
                        <span className="text-sm">+{log.xp} XP</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{XP_ACTION_LABELS[log.action]}</span>
                    </div>
                  ))}
                  {recentXpLogs.length === 0 && (
                    <div className="py-2 text-center text-xs text-muted-foreground">
                      まだXPはありません。ES提出や面接ログでXPを獲得できます。
                    </div>
                  )}
                </div>
              </QuestWindow>
            }
            items={allXpLogs.map((log) => ({
              title: `+${log.xp} XP`,
              subtitle: XP_ACTION_LABELS[log.action],
              meta: new Date(log.createdAt).toLocaleDateString(),
            }))}
            emptyText="XP獲得履歴がありません。"
          />
        </div>
      </section>
    </>
  );
}
