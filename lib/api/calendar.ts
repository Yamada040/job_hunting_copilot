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
