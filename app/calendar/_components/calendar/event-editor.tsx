"use client";

import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { EventFields } from "./event-fields";
import type { ModalAction } from "./reducer";
import type { CalendarFormState } from "./types";

/** 予定の作成・編集。Googleカレンダーの予定の作成と同じく、入力欄の下の右に「キャンセル」と「保存」を置く。 */
export function EventEditor({
  editing,
  selectedDate,
  formState,
  saving,
  error,
  dispatch,
  submitAction,
}: {
  editing: boolean;
  selectedDate: string;
  formState: CalendarFormState;
  saving: boolean;
  error: string | null;
  dispatch: (action: ModalAction) => void;
  submitAction: (formData: FormData) => void;
}) {
  return (
    <form action={submitAction} className="space-y-5">
      <DialogTitle className="sr-only">{editing ? "予定を編集" : "予定を追加"}</DialogTitle>
      <EventFields
        idPrefix="calendar-event"
        value={{ ...formState, date: selectedDate }}
        onChange={({ date, ...patch }) => {
          if (date !== undefined) dispatch({ type: "setSelectedDate", date });
          if (Object.keys(patch).length > 0) dispatch({ type: "updateForm", patch });
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => dispatch({ type: "closeModal" })}>
          キャンセル
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </Button>
      </div>
    </form>
  );
}
