import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { components } from "./schema";

export type CalendarItem = components["schemas"]["CalendarItem"];
export type CalendarEventCreate = components["schemas"]["CalendarEventCreate"];
export type CalendarEventUpdate = components["schemas"]["CalendarEventUpdate"];

export const calendarKeys = {
  all: ["calendar"] as const,
};

/** カレンダーの予定とESの締切（バックエンドが日付順にまとめて返す）。 */
export function useCalendarItems() {
  return useQuery({
    queryKey: calendarKeys.all,
    queryFn: () => unwrap(api.GET("/v1/calendar-events")),
  });
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
