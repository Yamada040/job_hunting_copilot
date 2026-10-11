"use client";

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useMemo, useOptimistic, useReducer, useState, useTransition } from "react";

import { calendarKeys, createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/lib/api/calendar";
import { CompanyPicker } from "@/app/_components/company-picker";
import { TYPE_LABEL } from "./calendar/constants";
import { CalendarDayCell, CalendarEvent, CalendarFormState } from "./calendar/types";
import { formatDateKey } from "./calendar/utils";

type Props = {
  events: CalendarEvent[];
};

const emptyForm: CalendarFormState = {
  title: "",
  company: null,
  type: "es" as CalendarEvent["type"],
  time: "",
};

type ModalState = {
  isModalOpen: boolean;
  selectedDate: string;
  editingId: string | null;
  formState: CalendarFormState;
  deletingId: string | null;
};

type ModalAction =
  | { type: "openModalForDate"; date: string }
  | { type: "closeModal" }
  | { type: "setSelectedDate"; date: string }
  | { type: "editPrefill"; event: CalendarEvent }
  | { type: "resetForm" }
  | { type: "updateForm"; patch: Partial<CalendarFormState> }
  | { type: "saveSuccess" }
  | { type: "deleteStart"; id: string }
  | { type: "deleteSuccess"; id: string }
  | { type: "deleteEnd" };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "openModalForDate":
      return {
        ...state,
        selectedDate: action.date,
        editingId: null,
        formState: { ...emptyForm },
        isModalOpen: true,
      };
    case "closeModal":
      return { ...state, isModalOpen: false };
    case "setSelectedDate":
      return { ...state, selectedDate: action.date };
    case "editPrefill":
      return {
        ...state,
        selectedDate: action.event.date,
        formState: {
          title: action.event.title,
          company:
            action.event.companyId && action.event.company
              ? { id: action.event.companyId, name: action.event.company }
              : null,
          type: action.event.type,
          time: action.event.time || "",
        },
        editingId: action.event.id,
        isModalOpen: true,
      };
    case "resetForm":
      return { ...state, formState: { ...emptyForm }, editingId: null };
    case "updateForm":
      return { ...state, formState: { ...state.formState, ...action.patch } };
    case "saveSuccess":
      return { ...state, formState: { ...emptyForm }, editingId: null };
    case "deleteStart":
      return { ...state, deletingId: action.id };
    case "deleteSuccess":
      return state.editingId === action.id ? { ...state, formState: { ...emptyForm }, editingId: null } : state;
    case "deleteEnd":
      return { ...state, deletingId: null };
    default:
      return state;
  }
}

type OptimisticEventsAction = { type: "save"; event: CalendarEvent } | { type: "delete"; id: string };

function optimisticEventsReducer(current: CalendarEvent[], action: OptimisticEventsAction): CalendarEvent[] {
  switch (action.type) {
    case "save": {
      const exists = current.some((evt) => evt.id === action.event.id);
      if (exists) return current.map((evt) => (evt.id === action.event.id ? action.event : evt));
      return [...current, action.event];
    }
    case "delete":
      return current.filter((evt) => evt.id !== action.id);
    default:
      return current;
  }
}

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
    isModalOpen: false,
    selectedDate: formatDateKey(new Date()),
    editingId: null,
    formState: { ...emptyForm },
    deletingId: null,
  }));
  const { isModalOpen, selectedDate, editingId, formState, deletingId } = modalState;
  const todayKey = formatDateKey(new Date());
  const weekdayLabel = ["日", "月", "火", "水", "木", "金", "土"];

  const monthDays = useMemo<CalendarDayCell[]>(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: { date: string; inCurrentMonth: boolean }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i -= 1) {
      const day = prevMonthDays - i;
      const date = formatDateKey(new Date(year, month - 1, day));
      cells.push({ date, inCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = formatDateKey(new Date(year, month, d));
      cells.push({ date, inCurrentMonth: true });
    }

    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const toAdd = 7 - remainder;
      for (let i = 1; i <= toAdd; i += 1) {
        const date = formatDateKey(new Date(year, month + 1, i));
        cells.push({ date, inCurrentMonth: false });
      }
    }

    return cells;
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    return optimisticEvents.reduce<Record<string, CalendarEvent[]>>((acc, evt) => {
      const key = evt.date;
      acc[key] = acc[key] ? [...acc[key], evt] : [evt];
      return acc;
    }, {});
  }, [optimisticEvents]);

  const todayEvents = useMemo(() => {
    return (eventsByDate[todayKey] || []).slice().sort((a, b) => {
      const ta = a.time || "99:99";
      const tb = b.time || "99:99";
      return ta.localeCompare(tb);
    });
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

  const openModalForDate = (date: string) => {
    dispatch({ type: "openModalForDate", date });
  };

  const [, submitAction, saving] = useActionState<null, FormData>(async () => {
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
        });
      } else {
        await createCalendarEvent({
          date: selectedDate,
          title,
          type: formState.type,
          time: time ?? undefined,
          companyId: formState.company?.id,
        });
      }
      await queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      dispatch({ type: "saveSuccess" });
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました。再度お試しください。");
    }
    return null;
  }, null);

  const handleEditPrefill = (evt: CalendarEvent) => {
    dispatch({ type: "editPrefill", event: evt });
  };

  const handleDeleteEvent = (evt: CalendarEvent) => {
    if (evt.id.startsWith("es-") || evt.id.startsWith("optimistic-")) return;
    if (!confirm("この予定を削除しますか？")) return;

    startDeleteTransition(async () => {
      // 楽観的に即時削除し、API失敗時はロールバックする
      applyOptimisticEvents({ type: "delete", id: evt.id });
      dispatch({ type: "deleteStart", id: evt.id });
      try {
        await deleteCalendarEvent(evt.id);
        await queryClient.invalidateQueries({ queryKey: calendarKeys.all });
        dispatch({ type: "deleteSuccess", id: evt.id });
      } catch (err) {
        console.error(err);
        alert("削除に失敗しました。再度お試しください。");
      } finally {
        dispatch({ type: "deleteEnd" });
      }
    });
  };

  return (
    <div className="mt-4 space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#3f3f46] bg-[#111111] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-full border border-[#52525b] bg-[#1f1f1f] p-2 shadow transition-colors hover:bg-[#2a2a2a]"
            aria-label="前の月へ"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="text-lg font-semibold text-white">
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-full border border-[#52525b] bg-[#1f1f1f] p-2 shadow transition-colors hover:bg-[#2a2a2a]"
            aria-label="次の月へ"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => openModalForDate(formatDateKey(new Date()))}
          className="group inline-flex items-center gap-2 px-2 py-1 text-sm font-bold text-white transition hover:text-yellow-400"
        >
          <span aria-hidden className="text-[0.7rem] transition-transform group-hover:translate-x-1">
            ▶
          </span>
          <PlusIcon className="h-4 w-4" />
          今日に追加
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-white/80">
        {["日", "月", "火", "水", "木", "金", "土"].map((d, idx) => (
          <div
            key={d}
            className={clsx(
              "rounded-lg border border-[#3f3f46] bg-[#1a1a1a] py-2 shadow-sm",
              idx === 0 && "text-rose-300",
              idx === 6 && "text-sky-300",
            )}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map(({ date, inCurrentMonth }) => {
          const jsDate = new Date(date);
          const day = jsDate.getDate();
          const weekday = jsDate.getDay();
          const isToday = date === todayKey;
          return (
            <button
              key={date}
              type="button"
              onClick={() => openModalForDate(date)}
              className={clsx(
                "h-14 rounded-lg border text-center text-sm font-bold shadow-sm transition",
                "bg-[#161616] hover:-translate-y-0.5 hover:bg-[#202020] hover:shadow-md",
                inCurrentMonth ? "border-[#3f3f46]" : "border-dashed border-[#3f3f46] text-white/40 opacity-70",
                isToday && "border-2 border-yellow-400 ring-1 ring-yellow-300/70",
              )}
            >
              <span
                className={clsx(
                  "inline-flex h-full items-center justify-center",
                  inCurrentMonth ? "" : "opacity-60",
                  weekday === 0 && "text-rose-300",
                  weekday === 6 && "text-sky-300",
                )}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-[#3f3f46] bg-[#111111] p-4">
          <h3 className="text-sm font-bold text-yellow-300">今日の予定</h3>
          <div className="mt-3 space-y-2">
            {todayEvents.length > 0 ? (
              todayEvents.map((evt) => (
                <button
                  key={`today-${evt.id}`}
                  type="button"
                  onClick={() => handleEditPrefill(evt)}
                  className="group flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-xs font-bold text-white transition hover:text-yellow-400"
                >
                  <span aria-hidden className="shrink-0 text-[0.7rem] transition-transform group-hover:translate-x-1">
                    ▶
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{evt.company || evt.title}</span>
                    <span className="mt-0.5 block text-white/70">
                      {TYPE_LABEL[evt.type]}
                      {evt.time ? ` · ${evt.time}` : ""}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="text-xs text-white/60">今日の予定はありません。</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#3f3f46] bg-[#111111] p-4">
          <h3 className="text-sm font-bold text-yellow-300">今週の予定</h3>
          <div className="mt-3 space-y-2">
            {weekEvents.length > 0 ? (
              weekEvents.map((evt) => {
                const d = new Date(evt.date);
                const label = `${d.getMonth() + 1}/${d.getDate()}(${weekdayLabel[d.getDay()]})`;
                return (
                  <button
                    key={`week-${evt.id}`}
                    type="button"
                    onClick={() => handleEditPrefill(evt)}
                    className="group flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-xs font-bold text-white transition hover:text-yellow-400"
                  >
                    <span aria-hidden className="shrink-0 text-[0.7rem] transition-transform group-hover:translate-x-1">
                      ▶
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{evt.company || evt.title}</span>
                      <span className="mt-0.5 block text-white/70">
                        {label} / {TYPE_LABEL[evt.type]}
                        {evt.time ? ` · ${evt.time}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-white/60">今週の予定はありません。</p>
            )}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-10">
          <div className="w-full max-w-md rounded-xl border border-[#3f3f46] bg-[#111111] p-5 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">選択した日の予定</h3>
                <p className="text-xs text-white/60">{selectedDate}</p>
              </div>
              <button
                type="button"
                className="sidebar-link-style text-sm text-white/70"
                onClick={() => dispatch({ type: "closeModal" })}
              >
                閉じる
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "resetForm" })}
                className="sidebar-link-style text-xs"
              >
                <PlusIcon className="h-4 w-4" />
                新しい予定を追加
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-lg border border-[#3f3f46] bg-[#1a1a1a] p-3 text-sm">
              {eventsByDate[selectedDate]?.length ? (
                eventsByDate[selectedDate].map((evt) => (
                  <div
                    key={evt.id}
                    className={clsx(
                      "rounded-lg border px-3 py-2 text-white",
                      evt.type === "es" && "border-rose-300/40 bg-rose-900/30 text-rose-100",
                      evt.type === "interview" && "border-indigo-300/40 bg-indigo-900/30 text-indigo-100",
                      evt.type === "intern" && "border-emerald-300/40 bg-emerald-900/30 text-emerald-100",
                      evt.type === "other" && "border-white/20 bg-black/40 text-white/90",
                    )}
                  >
                    <p className="text-xs font-semibold">{TYPE_LABEL[evt.type]}</p>
                    <p className="text-sm font-semibold">{evt.company || evt.title}</p>
                    <p className="text-xs text-white/70">
                      {evt.title} {evt.time ? `· ${evt.time}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      {evt.id.startsWith("es-") ? (
                        <a href={`/es/${evt.id.replace("es-", "")}`} className="sidebar-link-style text-[11px]">
                          ES詳細へ
                        </a>
                      ) : null}
                      {!evt.id.startsWith("es-") && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditPrefill(evt)}
                            className="sidebar-link-style text-[11px]"
                          >
                            予定を編集
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt)}
                            className="sidebar-link-style text-[11px]"
                            disabled={deletingId === evt.id}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            {deletingId === evt.id ? "削除中..." : "予定を削除"}
                          </button>
                        </>
                      )}
                      {evt.id.startsWith("es-") ? (
                        <span className="text-[11px] text-white/60">ES由来の予定はここでは削除できません</span>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/60">この日に登録された予定はありません。</p>
              )}
            </div>

            <form className="mt-4 space-y-3 border-t border-white/20 pt-4" action={submitAction}>
              <div className="space-y-1">
                <label className="text-xs text-white/70">日付</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => dispatch({ type: "setSelectedDate", date: e.target.value })}
                  className="dq-input text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-white/70">種別</label>
                  <select
                    value={formState.type}
                    onChange={(e) =>
                      dispatch({
                        type: "updateForm",
                        patch: { type: e.target.value as CalendarEvent["type"] },
                      })
                    }
                    className="dq-input text-sm"
                  >
                    <option value="es">ES締切</option>
                    <option value="interview">面接</option>
                    <option value="intern">インターン</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/70">時間（任意）</label>
                  <input
                    type="time"
                    value={formState.time}
                    onChange={(e) => dispatch({ type: "updateForm", patch: { time: e.target.value } })}
                    className="dq-input text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/70">企業（任意）</label>
                <CompanyPicker
                  value={formState.company}
                  onChange={(company) => dispatch({ type: "updateForm", patch: { company } })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/70">タイトル</label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => dispatch({ type: "updateForm", patch: { title: e.target.value } })}
                  className="dq-input text-sm"
                  placeholder="例）一次面接 / ES締切"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "resetForm" })}
                  className="sidebar-link-style text-sm"
                >
                  入力をクリア
                </button>
                <button type="submit" className="sidebar-link-style text-sm" disabled={saving}>
                  <PlusIcon className="h-4 w-4" />
                  {saving ? "保存中..." : editingId ? "予定を更新" : "予定を保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
