"use client";

import {
  AcademicCapIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  LightBulbIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { useAptitudeResult, useSelfAnalysisResult } from "@/lib/api/assessments";
import { useUpcomingCalendarItems } from "@/lib/api/calendar";
import { useCompanies } from "@/lib/api/companies";
import { useEsEntries } from "@/lib/api/es";
import { useInterviewLogs } from "@/lib/api/interviews";
import { useMe } from "@/lib/api/me";
import { useWebtestQuestions } from "@/lib/api/webtests";
import { ROUTES } from "@/lib/constants/routes";
import type { CarouselItem } from "./menu-carousel";
import { daysFrom, unreviewedInterviews, upcomingEvents, urgentDrafts } from "./menu-summaries";
import { Skeleton } from "@/components/ui/skeleton";

const Hot = ({ children }: { children: React.ReactNode }) => (
  <span className="font-bold text-destructive">{children}</span>
);
const Count = ({ children }: { children: React.ReactNode }) => (
  <b className="text-foreground tabular-nums">{children}</b>
);
const loading = (
  <span role="status" className="inline-block">
    <span className="sr-only">読み込み中…</span>
    <Skeleton className="mx-auto h-3 w-28" />
  </span>
);
const loadError = (
  <span role="alert" className="text-sm font-semibold text-destructive">
    読み込めませんでした。時間をおいて再度お試しください。
  </span>
);

/**
 * カルーセルのカード。回しながら「どこに手をつけるべきか」が分かるよう、各機能の今の状況（件数・急ぎのもの）を添える。
 * 専用のAPIは作らず、各画面と同じ一覧のAPIを使う（キャッシュを共有でき、画面を移っても取り直さずに済む）。
 */
export function useMenuItems(today: string): CarouselItem[] {
  const { data: es, error: esError } = useEsEntries();
  const { data: companies, error: companiesError } = useCompanies();
  const { data: interviews, error: interviewsError } = useInterviewLogs();
  const { data: calendar, error: calendarError } = useUpcomingCalendarItems(today);
  const { data: webtests, error: webtestsError } = useWebtestQuestions();
  const { data: selfAnalysis, error: selfAnalysisError } = useSelfAnalysisResult();
  const { data: aptitude, error: aptitudeError } = useAptitudeResult();
  const { data: me, error: meError } = useMe();

  const drafts = es?.filter((e) => e.status === "draft") ?? [];
  const urgent = es ? urgentDrafts(es, today) : [];
  const unreviewed = interviews ? unreviewedInterviews(interviews) : [];
  const upcoming = calendar ? upcomingEvents(calendar, today) : [];
  const next = upcoming[0];
  // カレンダーの急ぎは、今日と明日の予定
  const soon = upcoming.filter((item) => daysFrom(today, item.date) <= 1);
  const selfAnalysisPending = selfAnalysis === null || selfAnalysis?.aiResult === null;
  const aptitudePending = aptitude === null || aptitude?.aiResult === null;

  return [
    {
      label: "ES管理",
      href: ROUTES.ES,
      icon: DocumentTextIcon,
      alerts: urgent.length,
      summary: es ? (
        <>
          下書き <Count>{drafts.length}</Count>件
          <br />
          {urgent.length > 0 ? <Hot>締切まで3日以内 {urgent.length}件</Hot> : "急ぎの締切はありません"}
        </>
      ) : esError ? (
        loadError
      ) : (
        loading
      ),
    },
    {
      label: "企業管理",
      href: ROUTES.COMPANIES,
      icon: BuildingOfficeIcon,
      alerts: 0,
      summary: companies ? (
        <>
          登録 <Count>{companies.length}</Count>社
          <br />
          面接中 <Count>{companies.filter((c) => c.stage === "interviewing").length}</Count>社
        </>
      ) : companiesError ? (
        loadError
      ) : (
        loading
      ),
    },
    {
      label: "面接ログ",
      href: ROUTES.INTERVIEWS,
      icon: ChatBubbleLeftRightIcon,
      alerts: unreviewed.length,
      summary: interviews ? (
        <>
          記録 <Count>{interviews.length}</Count>件
          <br />
          {unreviewed.length > 0 ? <Hot>振り返り待ち {unreviewed.length}件</Hot> : "振り返りは済んでいます"}
        </>
      ) : interviewsError ? (
        loadError
      ) : (
        loading
      ),
    },
    {
      label: "カレンダー",
      href: ROUTES.CALENDAR,
      icon: CalendarDaysIcon,
      alerts: soon.length,
      summary: calendar ? (
        <>
          7日以内の予定 <Count>{upcoming.length}</Count>件
          <br />
          {next ? (
            <Hot>
              {daysFrom(today, next.date) === 0 ? "今日" : `${daysFrom(today, next.date)}日後`} {next.title}
            </Hot>
          ) : (
            "直近の予定はありません"
          )}
        </>
      ) : calendarError ? (
        loadError
      ) : (
        loading
      ),
    },
    {
      label: "Webテスト対策",
      href: ROUTES.WEBTESTS,
      icon: AcademicCapIcon,
      alerts: 0,
      summary: webtests ? (
        <>
          問題 <Count>{webtests.length}</Count>問
          <br />
          解くとXPが付きます
        </>
      ) : webtestsError ? (
        loadError
      ) : (
        loading
      ),
    },
    {
      label: "自己分析",
      href: ROUTES.SELF_ANALYSIS,
      icon: ClipboardDocumentCheckIcon,
      alerts: selfAnalysisPending ? 1 : 0,
      summary:
        selfAnalysis === undefined ? (
          selfAnalysisError ? (
            loadError
          ) : (
            loading
          )
        ) : selfAnalysis === null ? (
          <Hot>まだ回答していません</Hot>
        ) : selfAnalysis.aiResult === null ? (
          <Hot>AI自己分析がまだです</Hot>
        ) : (
          "分析済み。結果はES添削にも使われます"
        ),
    },
    {
      label: "適性チェック",
      href: ROUTES.APTITUDE,
      icon: LightBulbIcon,
      alerts: aptitudePending ? 1 : 0,
      summary:
        aptitude === undefined ? (
          aptitudeError ? (
            loadError
          ) : (
            loading
          )
        ) : aptitude === null ? (
          <Hot>まだ回答していません</Hot>
        ) : aptitude.aiResult === null ? (
          <Hot>AI診断がまだです</Hot>
        ) : (
          "診断済み"
        ),
    },
    {
      label: "プロフィール",
      href: ROUTES.PROFILE,
      icon: UserIcon,
      alerts: 0,
      summary: meError ? (
        loadError
      ) : me?.goalState ? (
        <span className="line-clamp-3">目標：{me.goalState}</span>
      ) : (
        "目標と就活の軸を設定できます"
      ),
    },
    {
      label: "お問い合わせ",
      href: ROUTES.CONTACT,
      icon: EnvelopeIcon,
      alerts: 0,
      summary: "使ってみた感想や不具合を送れます",
    },
  ];
}
