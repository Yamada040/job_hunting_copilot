"use client";

import { useState } from "react";

import { useCreateCalendarEvent, type CalendarItem } from "@/lib/api/calendar";
import type { CompanySummary } from "@/lib/api/companies";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { CompanyPicker } from "@/app/_components/company-picker";
import { TYPE_LABEL } from "@/app/calendar/_components/calendar/constants";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";

/** 画面を移らずに、その場で予定を追加するダイアログ。入れる項目はカレンダーの画面と同じ。 */
export function QuickEventDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>予定を追加</DialogTitle>
        <DialogDescription>追加した予定は、カレンダーとホームの直近の予定に出ます。</DialogDescription>
        {/* 開くたびに入力を空に戻すため、開いている間だけ描く */}
        {open && <QuickEventForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function QuickEventForm({ onDone }: { onDone: () => void }) {
  const createEvent = useCreateCalendarEvent();
  const [date, setDate] = useState(() => formatDateKey(new Date()));
  const [type, setType] = useState<CalendarItem["type"]>("interview");
  const [time, setTime] = useState("");
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [title, setTitle] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        createEvent.mutate(
          { title, type, date, time: time || undefined, companyId: company?.id },
          { onSuccess: onDone },
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="quick-event-date" className="text-xs text-muted-foreground">
            日付
          </Label>
          <Input id="quick-event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quick-event-time" className="text-xs text-muted-foreground">
            時間（任意）
          </Label>
          <Input id="quick-event-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="quick-event-type" className="text-xs text-muted-foreground">
          種別
        </Label>
        <NativeSelect
          id="quick-event-type"
          className="w-full"
          value={type}
          onChange={(e) => setType(e.target.value as CalendarItem["type"])}
        >
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">企業（任意）</Label>
        <CompanyPicker value={company} onChange={setCompany} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="quick-event-title" className="text-xs text-muted-foreground">
          タイトル
        </Label>
        <Input
          id="quick-event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="例）一次面接 / 説明会"
          required
        />
      </div>
      <ApiErrorMessage error={createEvent.error} />
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={createEvent.isPending}>
          {createEvent.isPending ? "保存中…" : "予定を追加"}
        </Button>
      </div>
    </form>
  );
}
