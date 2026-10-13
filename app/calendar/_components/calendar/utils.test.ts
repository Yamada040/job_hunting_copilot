import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateKey, formatDayLabel, monthCells, previewDayEvents } from "./utils";

describe("formatDateKey", () => {
  it("formats a Date object with zero-padded month/day", () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("formats an ISO date string", () => {
    expect(formatDateKey("2026-12-31T00:00:00")).toBe("2026-12-31");
  });

  it("formats a timestamp number", () => {
    const timestamp = new Date(2026, 5, 15).getTime();
    expect(formatDateKey(timestamp)).toBe("2026-06-15");
  });

  describe("invalid input fallback to now", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 13));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("falls back to the current time for an invalid string", () => {
      expect(formatDateKey("not-a-date")).toBe("2026-07-13");
    });

    it("falls back to the current time for null/undefined", () => {
      expect(formatDateKey(null)).toBe("2026-07-13");
      expect(formatDateKey(undefined)).toBe("2026-07-13");
    });
  });
});

describe("previewDayEvents", () => {
  it("時刻の早い順に上限まで出し、時刻の無い予定は最後に回して、残りは件数で返す", () => {
    const events = [
      { title: "ES締切", time: null },
      { title: "面接", time: "15:00" },
      { title: "説明会", time: "10:00" },
    ];
    const { shown, rest } = previewDayEvents(events, 2);
    expect(shown.map((e) => e.title)).toEqual(["説明会", "面接"]);
    expect(rest).toBe(1);
  });

  it("上限以下なら残りは0件", () => {
    expect(previewDayEvents([{ time: null }], 2).rest).toBe(0);
  });
});

describe("formatDayLabel", () => {
  it("月日と曜日の形にする", () => {
    expect(formatDayLabel("2026-10-13")).toBe("10月13日（火）");
  });
});

describe("monthCells", () => {
  it("1日のある週の日曜から、月末のある週の土曜までを並べる", () => {
    // 2026年10月は木曜に始まり、土曜に終わる
    const cells = monthCells(new Date(2026, 9, 1));
    expect(cells[0]).toEqual({ date: "2026-09-27", inCurrentMonth: false });
    expect(cells.find((c) => c.inCurrentMonth)?.date).toBe("2026-10-01");
    expect(cells.at(-1)).toEqual({ date: "2026-10-31", inCurrentMonth: true });
    expect(cells.length % 7).toBe(0);
  });
});
