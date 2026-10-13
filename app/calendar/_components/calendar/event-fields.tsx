"use client";

import { BuildingOffice2Icon, ClockIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

import { Input } from "@/components/ui/input";
import type { CompanySummary } from "@/lib/api/companies";
import { cn } from "@/lib/utils";
import { CompanyPicker } from "@/app/_components/company-picker";
import { TYPE_COLOR, TYPE_LABEL } from "./constants";
import type { CalendarEvent } from "./types";

export type EventFieldValues = {
  title: string;
  type: CalendarEvent["type"];
  date: string;
  time: string;
  company: CompanySummary | null;
  url: string;
};

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
        <div className="grid flex-1 gap-1">
          <div className="flex flex-wrap gap-2">
            <Input
              id={`${idPrefix}-date`}
              aria-label="日付"
              type="date"
              value={value.date}
              onChange={(e) => onChange({ date: e.target.value })}
              required
              className="h-10 w-auto"
            />
            <Input
              id={`${idPrefix}-time`}
              aria-label="時刻"
              type="time"
              value={value.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className="h-10 w-auto"
            />
          </div>
          <p className="text-xs text-muted-foreground">時刻を空にすると終日の予定になります</p>
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
