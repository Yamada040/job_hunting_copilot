import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateKey } from "./utils";

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
