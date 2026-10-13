import { CalendarEvent } from "./types";

export const TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  es: "ES締切",
  interview: "面接",
  intern: "インターン",
  other: "その他",
};
