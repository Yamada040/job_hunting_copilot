"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** 一覧の上の帯。左に絞り込みのチップ、右に検索を置く。 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** 絞り込みのチップ（FilterChips・Chip） */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* 狭い画面では、チップを折り返さず横にスクロールさせる（何段にもなると一覧が下に押し出されるため） */}
      <div className="-mx-6 flex min-w-0 items-center gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {children}
      </div>
      <div className="relative sm:w-72">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="検索"
          className="rounded-full bg-card pl-9"
        />
      </div>
    </div>
  );
}

/** 押すと切り替わる丸いボタン。絞り込みの条件に使う。 */
export function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** いずれか1つを選ぶ絞り込み。count を渡すと件数を添える。 */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 gap-2 sm:flex-wrap">
      {options.map((option) => (
        <Chip key={option.value} pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && <span className="tabular-nums opacity-80">{option.count}</span>}
        </Chip>
      ))}
    </div>
  );
}
