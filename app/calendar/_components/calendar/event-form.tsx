import { PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CompanyPicker } from "@/app/_components/company-picker";
import { TYPE_LABEL } from "./constants";
import { ModalAction } from "./reducer";
import { CalendarEvent, CalendarFormState } from "./types";

type Props = {
  selectedDate: string;
  formState: CalendarFormState;
  editing: boolean;
  saving: boolean;
  dispatch: (action: ModalAction) => void;
  submitAction: (formData: FormData) => void;
};

export function EventForm({ selectedDate, formState, editing, saving, dispatch, submitAction }: Props) {
  return (
    <form className="space-y-3 border-t pt-4" action={submitAction}>
      <div className="space-y-1">
        <Label htmlFor="calendar-event-date" className="text-xs text-muted-foreground">
          日付
        </Label>
        <Input
          id="calendar-event-date"
          type="date"
          value={selectedDate}
          onChange={(e) => dispatch({ type: "setSelectedDate", date: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="calendar-event-type" className="text-xs text-muted-foreground">
            種別
          </Label>
          <NativeSelect
            id="calendar-event-type"
            className="w-full"
            value={formState.type}
            onChange={(e) => dispatch({ type: "updateForm", patch: { type: e.target.value as CalendarEvent["type"] } })}
          >
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="calendar-event-time" className="text-xs text-muted-foreground">
            時間（任意）
          </Label>
          <Input
            id="calendar-event-time"
            type="time"
            value={formState.time}
            onChange={(e) => dispatch({ type: "updateForm", patch: { time: e.target.value } })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">企業（任意）</Label>
        <CompanyPicker
          value={formState.company}
          onChange={(company) => dispatch({ type: "updateForm", patch: { company } })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="calendar-event-title" className="text-xs text-muted-foreground">
          タイトル
        </Label>
        <Input
          id="calendar-event-title"
          type="text"
          value={formState.title}
          onChange={(e) => dispatch({ type: "updateForm", patch: { title: e.target.value } })}
          placeholder="例）一次面接 / ES締切"
          required
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => dispatch({ type: "resetForm" })}>
          入力をクリア
        </Button>
        <Button type="submit" variant="default" disabled={saving}>
          <PlusIcon className="h-4 w-4" />
          {saving ? "保存中..." : editing ? "予定を更新" : "予定を保存"}
        </Button>
      </div>
    </form>
  );
}
