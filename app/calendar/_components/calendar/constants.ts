import { CalendarEvent } from "./types";

export const TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  es: "ES締切",
  interview: "面接",
  intern: "インターン",
  other: "その他",
};

/** 予定の種類の色。月の表の帯（chip）と、狭い画面の点（dot）に使う。 */
export const TYPE_COLOR: Record<CalendarEvent["type"], { chip: string; dot: string }> = {
  es: { chip: "border-category-es bg-category-es/10", dot: "bg-category-es" },
  interview: { chip: "border-category-interview bg-category-interview/10", dot: "bg-category-interview" },
  intern: { chip: "border-category-intern bg-category-intern/10", dot: "bg-category-intern" },
  other: { chip: "border-muted-foreground bg-muted", dot: "bg-muted-foreground" },
};
