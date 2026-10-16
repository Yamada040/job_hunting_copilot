"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useMemo, useOptimistic, useReducer, useState, useTransition } from "react";

import { calendarKeys, createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/lib/api/calendar";
import { TYPE_LABEL } from "./calendar/constants";
import { showSuccessNotice } from "@/app/_components/avatar/avatar-notice-store";
import { EventDialog } from "./calendar/event-dialog";
import { eventLink, eventTiming } from "./calendar/event-fields";
import { EventSummary } from "./calendar/event-summary";
import { MonthGrid } from "./calendar/month-grid";
import { emptyForm, modalReducer, ModalState, optimisticEventsReducer } from "./calendar/reducer";
import { CalendarEvent } from "./calendar/types";
import { formatDateKey, groupByDate, monthCells, overlaps, sortByTime } from "./calendar/utils";

type Props = {
  events: CalendarEvent[];
};

export function InteractiveCalendar({ events }: Props) {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  // 保存・削除を楽観的に即時反映し、API失敗時はeventsへ自動ロールバックする
  const [optimisticEvents, applyOptimisticEvents] = useOptimistic(events, optimisticEventsReducer);
  const [, startDeleteTransition] = useTransition();
  const [modalState, dispatch] = useReducer(modalReducer, null, (): ModalState => ({
    view: null,
    selectedDate: formatDateKey(new Date()),
    selectedEvent: null,
    formState: { ...emptyForm },
    deletingId: null,
    error: null,
  }));
  const { selectedDate, formState } = modalState;
  const editingId = modalState.view === "edit" ? (modalState.selectedEvent?.id ?? null) : null;
  const todayKey = formatDateKey(new Date());
  const weekdayLabel = ["日", "月", "火", "水", "木", "金", "土"];

  const monthDays = useMemo(() => monthCells(currentMonth), [currentMonth]);

  const eventsByDate = useMemo(() => groupByDate(optimisticEvents), [optimisticEvents]);

  const todayEvents = useMemo(() => {
    return sortByTime(eventsByDate[todayKey] || []);
  }, [eventsByDate, todayKey]);

  // 今日から今週の土曜までに重なる予定。もう始まっている何日か続く予定は、今日の予定として並べる
  const weekEvents = useMemo(() => {
    const now = new Date();
    const endOfWeek = formatDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay())));
    const sortKey = (evt: CalendarEvent) => `${evt.date < todayKey ? todayKey : evt.date} ${evt.time || "99:99"}`;
    return optimisticEvents
      .filter((evt) => overlaps(evt, todayKey, endOfWeek))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }, [optimisticEvents, todayKey]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const base = prev instanceof Date ? prev : new Date();
      return new Date(base.getFullYear(), base.getMonth() - 1, 1);
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const base = prev instanceof Date ? prev : new Date();
      return new Date(base.getFullYear(), base.getMonth() + 1, 1);
    });
  };

  const [, submitAction, saving] = useActionState<null, FormData>(async () => {
    const url = eventLink(formState);
    const { time, endDate } = eventTiming({ ...formState, date: selectedDate });
    // 一時ID（新規時）で即時反映し、API完了後に実データで置き換える
    applyOptimisticEvents({
      type: "save",
      event: {
        id: editingId ?? `optimistic-${Date.now()}`,
        date: selectedDate,
        title: formState.title || "予定",
        company: formState.company?.name ?? null,
        companyId: formState.company?.id ?? null,
        type: formState.type,
        time,
        endDate,
        url,
        note: formState.note || null,
      },
    });
    try {
      const title = formState.title || "予定";
      if (editingId) {
        await updateCalendarEvent(editingId, {
          date: selectedDate,
          title,
          type: formState.type,
          time,
          endDate,
          companyId: formState.company?.id ?? null,
          url,
          note: formState.note || null,
        });
      } else {
        await createCalendarEvent({
          date: selectedDate,
          title,
          type: formState.type,
          time: time ?? undefined,
          endDate: endDate ?? undefined,
          companyId: formState.company?.id,
          url: url ?? undefined,
          note: formState.note || undefined,
        });
      }
      await queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      dispatch({ type: "saveSuccess" });
      showSuccessNotice(editingId ? "予定を保存しました" : "予定を追加しました");
    } catch (err) {
      console.error(err);
      dispatch({ type: "saveFailed", message: "保存に失敗しました。時間をおいてもう一度お試しください。" });
    }
    return null;
  }, null);

  const openDetail = (evt: CalendarEvent) => dispatch({ type: "openDetail", event: evt });

  const handleDeleteEvent = (evt: CalendarEvent) => {
    if (evt.id.startsWith("es-") || evt.id.startsWith("optimistic-")) return;

    startDeleteTransition(async () => {
      // 楽観的に即時削除し、API失敗時はロールバックする
      applyOptimisticEvents({ type: "delete", id: evt.id });
      dispatch({ type: "deleteStart", id: evt.id });
      try {
        await deleteCalendarEvent(evt.id);
        await queryClient.invalidateQueries({ queryKey: calendarKeys.all });
        dispatch({ type: "deleteSuccess" });
        showSuccessNotice("予定を削除しました");
      } catch (err) {
        console.error(err);
        dispatch({ type: "deleteFailed", message: "削除に失敗しました。時間をおいてもう一度お試しください。" });
      }
    });
  };

  return (
    <div className="space-y-4">
      <MonthGrid
        currentMonth={currentMonth}
        monthDays={monthDays}
        todayKey={todayKey}
        eventsByDate={eventsByDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onAddToday={() => dispatch({ type: "openCreate", date: formatDateKey(new Date()) })}
        onCreate={(date) => dispatch({ type: "openCreate", date })}
        onOpenDay={(date) => dispatch({ type: "openDay", date })}
        onOpenEvent={openDetail}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <EventSummary
          title="今日の予定"
          events={todayEvents}
          emptyText="今日の予定はありません。"
          describe={(evt) => `${TYPE_LABEL[evt.type]}${evt.time ? ` · ${evt.time}` : ""}`}
          onSelect={openDetail}
        />
        <EventSummary
          title="今週の予定"
          events={weekEvents}
          emptyText="今週の予定はありません。"
          describe={(evt) => {
            const d = new Date(evt.date);
            const label = `${d.getMonth() + 1}/${d.getDate()}(${weekdayLabel[d.getDay()]})`;
            return `${label} / ${TYPE_LABEL[evt.type]}${evt.time ? ` · ${evt.time}` : ""}`;
          }}
          onSelect={openDetail}
        />
      </div>

      <EventDialog
        state={modalState}
        dayEvents={eventsByDate[selectedDate] ?? []}
        saving={saving}
        dispatch={dispatch}
        submitAction={submitAction}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
