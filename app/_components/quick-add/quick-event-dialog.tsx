"use client";

import { useState } from "react";

import { useCreateCalendarEvent } from "@/lib/api/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import {
  EventFields,
  eventLink,
  eventTiming,
  type EventFieldValues,
} from "@/app/calendar/_components/calendar/event-fields";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";

/** 画面を移らずに、その場で予定を追加するダイアログ。入れる項目と見た目はカレンダーの画面と同じ。 */
export function QuickEventDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-8 sm:max-w-xl">
        <DialogTitle className="sr-only">予定を追加</DialogTitle>
        <DialogDescription className="sr-only">
          追加した予定は、カレンダーとホームの直近の予定に出ます。
        </DialogDescription>
        {/* 開くたびに入力を空に戻すため、開いている間だけ描く */}
        {open && <QuickEventForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function QuickEventForm({ onDone }: { onDone: () => void }) {
  const createEvent = useCreateCalendarEvent();
  const [values, setValues] = useState<EventFieldValues>(() => ({
    title: "",
    type: "interview",
    date: formatDateKey(new Date()),
    // カレンダーの画面と同じく終日から始める（時刻を必ず入れさせると、すぐに足しにくくなるため）
    allDay: true,
    time: "",
    endDate: "",
    company: null,
    url: "",
    note: "",
  }));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const { time, endDate } = eventTiming(values);
        createEvent.mutate(
          {
            title: values.title,
            type: values.type,
            date: values.date,
            time: time ?? undefined,
            endDate: endDate ?? undefined,
            companyId: values.company?.id,
            url: eventLink(values) ?? undefined,
            note: values.note || undefined,
          },
          { onSuccess: onDone },
        );
      }}
    >
      <EventFields idPrefix="quick-event" value={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />
      <ApiErrorMessage error={createEvent.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          キャンセル
        </Button>
        <Button type="submit" disabled={createEvent.isPending}>
          {createEvent.isPending ? "保存中…" : "保存"}
        </Button>
      </div>
    </form>
  );
}
