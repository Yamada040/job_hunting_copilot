"use client";

import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { DayEvents } from "./day-events";
import { EventDetail } from "./event-detail";
import { EventEditor } from "./event-editor";
import type { ModalAction, ModalState } from "./reducer";
import type { CalendarEvent } from "./types";

type Props = {
  state: ModalState;
  /** 選んだ日の予定（その日の一覧で使う） */
  dayEvents: CalendarEvent[];
  saving: boolean;
  dispatch: (action: ModalAction) => void;
  submitAction: (formData: FormData) => void;
  onDelete: (event: CalendarEvent) => void;
};

/** カレンダーの予定のダイアログ。作成・編集・詳細・その日の一覧を、state.view で切り替える。 */
export function EventDialog({ state, dayEvents, saving, dispatch, submitAction, onDelete }: Props) {
  const { view, selectedDate, selectedEvent, formState, deletingId, error } = state;
  return (
    <Dialog open={view !== null} onOpenChange={(open) => !open && dispatch({ type: "closeModal" })}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-8 sm:max-w-xl">
        <DialogDescription className="sr-only">カレンダーの予定</DialogDescription>
        {(view === "create" || view === "edit") && (
          <EventEditor
            editing={view === "edit"}
            selectedDate={selectedDate}
            formState={formState}
            saving={saving}
            error={error}
            dispatch={dispatch}
            submitAction={submitAction}
          />
        )}
        {view === "detail" && selectedEvent && (
          <>
            <EventDetail
              event={selectedEvent}
              deleting={deletingId === selectedEvent.id}
              onEdit={() => dispatch({ type: "startEdit", event: selectedEvent })}
              onDelete={() => onDelete(selectedEvent)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}
        {view === "day" && (
          <DayEvents
            date={selectedDate}
            events={dayEvents}
            onSelect={(event) => dispatch({ type: "openDetail", event })}
            onAdd={() => dispatch({ type: "openCreate", date: selectedDate })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
