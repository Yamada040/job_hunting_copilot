import { describe, expect, it } from "vitest";

import { daysFrom, todayXp, unreviewedInterviews, upcomingEvents, urgentDrafts } from "./menu-summaries";

describe("daysFrom", () => {
  it("月をまたいでも日数を数える", () => {
    expect(daysFrom("2026-10-30", "2026-11-02")).toBe(3);
    expect(daysFrom("2026-10-12", "2026-10-11")).toBe(-1);
  });
});

describe("urgentDrafts", () => {
  const today = "2026-10-12";

  it("締切が今日から3日以内の下書きだけを数える", () => {
    const entries = [
      { status: "draft" as const, deadline: "2026-10-12" },
      { status: "draft" as const, deadline: "2026-10-15" },
      { status: "draft" as const, deadline: "2026-10-16" },
      { status: "draft" as const, deadline: "2026-10-11" },
      { status: "draft" as const, deadline: null },
      { status: "submitted" as const, deadline: "2026-10-13" },
    ];

    expect(urgentDrafts(entries, today)).toEqual([entries[0], entries[1]]);
  });
});

describe("unreviewedInterviews", () => {
  it("振り返り結果の無いログだけを返す", () => {
    expect(unreviewedInterviews([{ aiResult: null }, { aiResult: "振り返り結果" }])).toEqual([{ aiResult: null }]);
  });
});

describe("upcomingEvents", () => {
  it("今日から7日以内の予定を、日付と時刻の早い順に並べる", () => {
    const items = [
      { date: "2026-10-14", time: "15:00" },
      { date: "2026-10-14", time: "10:00" },
      { date: "2026-10-12", time: null },
      { date: "2026-10-20", time: null },
      { date: "2026-10-11", time: null },
    ];

    expect(upcomingEvents(items, "2026-10-12")).toEqual([items[2], items[1], items[0]]);
  });
});

describe("todayXp", () => {
  it("今日の獲得XPだけを合計する", () => {
    const today = "2026-10-12";
    const logs = [
      { xp: 25, createdAt: new Date(2026, 9, 12, 9, 0).toISOString() },
      { xp: 5, createdAt: new Date(2026, 9, 12, 23, 30).toISOString() },
      { xp: 20, createdAt: new Date(2026, 9, 11, 23, 59).toISOString() },
    ];

    expect(todayXp(logs, today)).toBe(30);
  });
});
