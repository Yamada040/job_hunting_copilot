function toSafeDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function formatDateKey(dateLike: unknown) {
  const date = toSafeDate(dateLike);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 予定を時刻の早い順に並べる。時刻の無いもの（ESの締切など）は、その日の最後に回す。 */
export function sortByTime<T extends { time?: string | null }>(events: T[]): T[] {
  return events.slice().sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

/** 月の表の1日に出す予定。max 件までを時刻順に出し、残りは件数だけ返す。 */
export function previewDayEvents<T extends { time?: string | null }>(events: T[], max: number) {
  const sorted = sortByTime(events);
  return { shown: sorted.slice(0, max), rest: Math.max(0, sorted.length - max) };
}
