"use client";

import { BuildingOffice2Icon, ClockIcon, DocumentTextIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CompanySummary } from "@/lib/api/companies";
import { cn } from "@/lib/utils";
import { CompanyPicker } from "@/app/_components/company-picker";
import { TYPE_COLOR, TYPE_LABEL } from "./constants";
import type { CalendarEvent } from "./types";

export type EventFieldValues = {
  title: string;
  type: CalendarEvent["type"];
  date: string;
  allDay: boolean;
  time: string;
  endDate: string;
  company: CompanySummary | null;
  url: string;
  note: string;
};

/**
 * 保存する時刻と最終日。終日なら時刻を入れない。期間（最終日）はインターンの終日の予定だけで、
 * 初日と同じか前なら1日だけの予定にする。
 */
export function eventTiming(values: Pick<EventFieldValues, "type" | "date" | "allDay" | "time" | "endDate">) {
  const time = values.allDay ? null : values.time || null;
  const endDate =
    values.allDay && values.type === "intern" && values.endDate && values.endDate > values.date ? values.endDate : null;
  return { time, endDate };
}

/** 保存するリンク。リンクの欄は面接のときだけ出すので、ほかの種類では入っていても保存しない。 */
export function eventLink(values: Pick<EventFieldValues, "type" | "url">): string | null {
  const url = values.url.trim();
  return values.type === "interview" && url ? url : null;
}

/**
 * 予定の入力欄。Googleカレンダーの予定の作成と同じく、大きなタイトル・種類・日時・企業を上から並べる。
 * カレンダーの画面と、下のメニューの「＋」から開く追加の画面の両方で使う。
 */
export function EventFields({
  value,
  onChange,
  idPrefix,
}: {
  value: EventFieldValues;
  onChange: (patch: Partial<EventFieldValues>) => void;
  /** 同じ画面に2つ出ても id がぶつからないよう、欄の id の頭に付ける */
  idPrefix: string;
}) {
  return (
    <div className="space-y-5">
      <input
        aria-label="タイトル"
        value={value.title}
        onChange={(e) => onChange({ title: e.target.value })}
        maxLength={100}
        placeholder="タイトルを追加"
        required
        autoFocus
        className="w-full border-b-2 border-border bg-transparent pb-2 text-2xl font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground focus:border-primary"
      />

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">種類</legend>
        {(Object.keys(TYPE_LABEL) as CalendarEvent["type"][]).map((type) => (
          <label
            key={type}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              value.type === type
                ? "border-primary bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            <input
              type="radio"
              name={`${idPrefix}-type`}
              value={type}
              checked={value.type === type}
              onChange={() => onChange({ type })}
              className="sr-only"
            />
            <span className={cn("h-2 w-2 rounded-full", TYPE_COLOR[type].dot)} aria-hidden />
            {TYPE_LABEL[type]}
          </label>
        ))}
      </fieldset>

      <div className="flex items-start gap-3">
        <ClockIcon className="mt-2.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="grid flex-1 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={`${idPrefix}-date`}
              aria-label={value.allDay && value.type === "intern" ? "初日" : "日付"}
              type="date"
              value={value.date}
              onChange={(e) => onChange({ date: e.target.value })}
              required
              className="h-10 w-auto"
            />
            {/* 期間は、何日か続くことが多いインターンの終日の予定だけで選べる */}
            {value.allDay && value.type === "intern" && (
              <>
                <span className="text-muted-foreground">〜</span>
                <Input
                  id={`${idPrefix}-end-date`}
                  aria-label="最終日"
                  type="date"
                  value={value.endDate}
                  min={value.date}
                  onChange={(e) => onChange({ endDate: e.target.value })}
                  className="h-10 w-auto"
                />
              </>
            )}
            {!value.allDay && (
              <Input
                id={`${idPrefix}-time`}
                aria-label="時刻"
                type="time"
                value={value.time}
                onChange={(e) => onChange({ time: e.target.value })}
                required
                className="h-10 w-auto"
              />
            )}
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.allDay}
              // 終日にしたら時刻を、時刻を入れるなら期間を消す（期間のある予定は終日として扱うため）
              onChange={(e) => onChange(e.target.checked ? { allDay: true, time: "" } : { allDay: false, endDate: "" })}
              className="h-4 w-4 accent-primary"
            />
            終日
          </label>
        </div>
      </div>

      {value.type === "interview" && (
        <div className="flex items-start gap-3">
          <VideoCameraIcon className="mt-2.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            id={`${idPrefix}-url`}
            aria-label="リンク"
            type="url"
            value={value.url}
            onChange={(e) => onChange({ url: e.target.value })}
            maxLength={500}
            // バックエンドと同じく http(s) のリンクだけを受け付ける
            pattern="https?://.*"
            placeholder="オンライン面接のリンク（任意）"
            className="h-10 flex-1"
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <DocumentTextIcon className="mt-2.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <Textarea
          id={`${idPrefix}-note`}
          aria-label="備考"
          value={value.note}
          onChange={(e) => onChange({ note: e.target.value })}
          maxLength={2000}
          rows={3}
          placeholder="備考（任意）"
          className="flex-1 resize-y"
        />
      </div>

      <div className="flex items-start gap-3">
        <BuildingOffice2Icon className="mt-2.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex-1">
          <CompanyPicker
            value={value.company}
            onChange={(company) => onChange({ company })}
            placeholder="企業を選ぶ（任意）"
          />
        </div>
      </div>
    </div>
  );
}
