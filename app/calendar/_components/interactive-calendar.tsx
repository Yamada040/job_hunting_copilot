"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useMemo, useOptimistic, useReducer, useState, useTransition } from "react";

import { calendarKeys, createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/lib/api/calendar";
import { TYPE_LABEL } from "./calendar/constants";
import { EventDialog } from "./calendar/event-dialog";
import { eventLink } from "./calendar/event-fields";
import { EventSummary } from "./calendar/event-summary";
import { MonthGrid } from "./calendar/month-grid";
import { emptyForm, modalReducer, ModalState, optimisticEventsReducer } from "./calendar/reducer";
import { CalendarEvent } from "./calendar/types";
import { formatDateKey, monthCells, sortByTime } from "./calendar/utils";

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

  const eventsByDate = useMemo(() => {
    return optimisticEvents.reduce<Record<string, CalendarEvent[]>>((acc, evt) => {
      const key = evt.date;
      acc[key] = acc[key] ? [...acc[key], evt] : [evt];
      return acc;
    }, {});
  }, [optimisticEvents]);

  const todayEvents = useMemo(() => {
    return sortByTime(eventsByDate[todayKey] || []);
  }, [eventsByDate, todayKey]);

  const weekEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    return optimisticEvents
      .filter((evt) => {
        if (!evt.date) return false;
        const date = new Date(evt.date);
        if (Number.isNaN(date.getTime())) return false;
        date.setHours(0, 0, 0, 0);
        return date >= now && date <= endOfWeek;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "99:99").localeCompare(b.time || "99:99");
      });
  }, [optimisticEvents]);

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
        time: formState.time || null,
        url,
      },
    });
    try {
      const title = formState.title || "予定";
      const time = formState.time || null;
      if (editingId) {
        await updateCalendarEvent(editingId, {
          date: selectedDate,
          title,
          type: formState.type,
          time,
          companyId: formState.company?.id ?? null,
          url,
        });
      } else {
        await createCalendarEvent({
          date: selectedDate,
          title,
          type: formState.type,
          time: time ?? undefined,
          companyId: formState.company?.id,
          url: url ?? undefined,
        });
      }
      await queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      dispatch({ type: "saveSuccess" });
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
