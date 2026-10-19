import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { components } from "./schema";

export type CalendarItem = components["schemas"]["CalendarItem"];
export type CalendarEventCreate = components["schemas"]["CalendarEventCreate"];
export type CalendarEventUpdate = components["schemas"]["CalendarEventUpdate"];

/** 期間（YYYY-MM-DD、どちらも含む）。何日か続く予定は、期間に少しでも重なれば含まれる。 */
export type CalendarPeriod = { from: string; to: string };

export const calendarKeys = {
  all: ["calendar"] as const,
  period: (period: CalendarPeriod) => ["calendar", period] as const,
  company: (companyId: string) => ["calendar", "company", companyId] as const,
};

/**
 * 期間内の予定とESの締切（バックエンドが日付順にまとめて返す）。予定は年をまたいでたまっていくので、全件ではなく見ている期間だけを取る。
 * 期間を変えたときに表が空になってちらつかないよう、読み込むまでは前の期間の値を見せる。
 */
export function useCalendarItems(period: CalendarPeriod) {
  return useQuery({
    queryKey: calendarKeys.period(period),
    queryFn: () => unwrap(api.GET("/v1/calendar-events", { params: { query: period } })),
    placeholderData: keepPreviousData,
  });
}

/** 企業にひも付く予定とESの締切。 */
// ほかと違って期間を渡さないのは、1社の予定は数が限られ、終わった面接も含めて選考の流れを見返したいため
export function useCompanyCalendarItems(companyId: string) {
  return useQuery({
    queryKey: calendarKeys.company(companyId),
    queryFn: () => unwrap(api.GET("/v1/calendar-events", { params: { query: { companyId } } })),
  });
}

/** 直近の予定として取る日数。ホーム・カレンダーの今日と今週の予定・アバターが同じ期間を使い、キャッシュを共有する。 */
export const UPCOMING_DAYS = 7;

/** 今日（YYYY-MM-DD）から UPCOMING_DAYS 日後までの予定とESの締切。 */
export function useUpcomingCalendarItems(today: string) {
  return useCalendarItems({ from: today, to: addDays(today, UPCOMING_DAYS) });
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createCalendarEvent(body: CalendarEventCreate) {
  return unwrap(api.POST("/v1/calendar-events", { body }));
}

/** 予定を追加し、カレンダーとホームの直近の予定を取り直す。 */
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all }),
  });
}

export function updateCalendarEvent(id: string, body: CalendarEventUpdate) {
  return unwrap(
    api.PATCH("/v1/calendar-events/{calendarEventId}", { params: { path: { calendarEventId: id } }, body }),
  );
}

export function deleteCalendarEvent(id: string) {
  return unwrap(api.DELETE("/v1/calendar-events/{calendarEventId}", { params: { path: { calendarEventId: id } } }));
}

// 購読用URLの状態は予定とは別に持つ（予定を保存するたびに取り直さないよう、calendarKeys の下に置かない）
const calendarFeedKey = ["calendar-feed"] as const;

/** カレンダーの購読用URLを作ってあるか。URLそのものは作ったときにしか分からない。 */
export function useCalendarFeed() {
  return useQuery({
    queryKey: calendarFeedKey,
    queryFn: () => unwrap(api.GET("/v1/calendar-feed")),
  });
}

/** 購読用URLを作る（作り直す）。返ったトークンは二度と取得できないので、呼び出し側で表示する。 */
export function useCreateCalendarFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/v1/calendar-feed")),
    onSuccess: ({ createdAt }) => queryClient.setQueryData(calendarFeedKey, { enabled: true, createdAt }),
  });
}

export function useDeleteCalendarFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE("/v1/calendar-feed")),
    onSuccess: () => queryClient.setQueryData(calendarFeedKey, { enabled: false, createdAt: null }),
  });
}

/** 購読用URL。バックエンドは画面と同じドメインの /v1 にある。 */
export function calendarFeedUrl(token: string) {
  return `${window.location.origin}/v1/calendar-feed/${token}`;
}
