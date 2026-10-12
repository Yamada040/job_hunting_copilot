import { CalendarEvent, CalendarFormState } from "./types";

export const emptyForm: CalendarFormState = {
  title: "",
  company: null,
  type: "es" as CalendarEvent["type"],
  time: "",
};

export type ModalState = {
  isModalOpen: boolean;
  selectedDate: string;
  editingId: string | null;
  formState: CalendarFormState;
  deletingId: string | null;
};

export type ModalAction =
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

export function modalReducer(state: ModalState, action: ModalAction): ModalState {
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
