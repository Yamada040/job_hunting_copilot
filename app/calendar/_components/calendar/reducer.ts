import { CalendarEvent, CalendarFormState } from "./types";

export const emptyForm: CalendarFormState = {
  title: "",
  company: null,
  type: "interview" as CalendarEvent["type"],
  // Googleカレンダーの月の表示と同じく、日付を押して作る予定は終日から始める
  allDay: true,
  time: "",
  endDate: "",
  url: "",
};

/**
 * ダイアログで見せる画面。Googleカレンダーと同じく、日付の空いたところを押すと作成、予定を押すと詳細、
 * 「+N件」を押すとその日の一覧を出す。詳細から編集へ移る。
 */
export type ModalView = "create" | "edit" | "detail" | "day";

export type ModalState = {
  /** 開いていなければ null */
  view: ModalView | null;
  selectedDate: string;
  /** 詳細・編集で見ている予定 */
  selectedEvent: CalendarEvent | null;
  formState: CalendarFormState;
  deletingId: string | null;
  /** 保存・削除に失敗したときに、ダイアログの中に出す説明 */
  error: string | null;
};

export type ModalAction =
  | { type: "openCreate"; date: string }
  | { type: "openDay"; date: string }
  | { type: "openDetail"; event: CalendarEvent }
  | { type: "startEdit"; event: CalendarEvent }
  | { type: "closeModal" }
  | { type: "setSelectedDate"; date: string }
  | { type: "updateForm"; patch: Partial<CalendarFormState> }
  | { type: "saveSuccess" }
  | { type: "saveFailed"; message: string }
  | { type: "deleteStart"; id: string }
  | { type: "deleteSuccess" }
  | { type: "deleteFailed"; message: string };

export function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "openCreate":
      return {
        ...state,
        view: "create",
        selectedDate: action.date,
        selectedEvent: null,
        formState: { ...emptyForm },
        error: null,
      };
    case "openDay":
      return { ...state, view: "day", selectedDate: action.date, selectedEvent: null, error: null };
    case "openDetail":
      return { ...state, view: "detail", selectedDate: action.event.date, selectedEvent: action.event, error: null };
    case "startEdit":
      return {
        ...state,
        view: "edit",
        selectedDate: action.event.date,
        selectedEvent: action.event,
        formState: {
          title: action.event.title,
          company:
            action.event.companyId && action.event.company
              ? { id: action.event.companyId, name: action.event.company }
              : null,
          type: action.event.type,
          allDay: !action.event.time,
          time: action.event.time || "",
          endDate: action.event.endDate || "",
          url: action.event.url || "",
        },
        error: null,
      };
    case "closeModal":
      return { ...state, view: null, error: null };
    case "setSelectedDate":
      return { ...state, selectedDate: action.date };
    case "updateForm":
      return { ...state, formState: { ...state.formState, ...action.patch } };
    // Googleカレンダーと同じく、保存・削除できたらダイアログを閉じる
    case "saveSuccess":
      return { ...state, view: null, formState: { ...emptyForm }, selectedEvent: null, error: null };
    case "saveFailed":
      return { ...state, error: action.message };
    case "deleteStart":
      return { ...state, deletingId: action.id, error: null };
    case "deleteSuccess":
      return { ...state, view: null, selectedEvent: null, deletingId: null };
    case "deleteFailed":
      return { ...state, deletingId: null, error: action.message };
    default:
      return state;
  }
}

export type OptimisticEventsAction = { type: "save"; event: CalendarEvent } | { type: "delete"; id: string };

export function optimisticEventsReducer(current: CalendarEvent[], action: OptimisticEventsAction): CalendarEvent[] {
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
