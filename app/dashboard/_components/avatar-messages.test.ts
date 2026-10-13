import { describe, expect, it } from "vitest";

import { avatarMessages } from "./avatar-messages";

const quiet = { today: "2026-10-13", upcoming: [], urgentDrafts: 0, unreviewedInterviews: 0, earnedToday: 0 };

describe("avatarMessages", () => {
  it("何も無ければ、あいさつだけを言う", () => {
    expect(avatarMessages(quiet)).toEqual([
      "今日もいっしょにがんばろう",
      "気になる企業はあった？",
      "少しずつでも前に進もう",
    ]);
  });

  it("今日・明日の予定、急ぎのES、振り返り待ち、今日のXPの順に言い、最後にあいさつを足す", () => {
    const messages = avatarMessages({
      ...quiet,
      upcoming: [{ title: "一次面接", date: "2026-10-14" }],
      urgentDrafts: 1,
      unreviewedInterviews: 2,
      earnedToday: 30,
    });

    expect(messages.slice(0, 4)).toEqual([
      "明日は「一次面接」。準備しておこう",
      "締切が近いESが1件あるよ",
      "面接の振り返りが2件待ってるよ",
      "今日は +30 XP！いい調子",
    ]);
    expect(messages).toHaveLength(7);
  });

  it("2日後以降の予定には触れない", () => {
    expect(avatarMessages({ ...quiet, upcoming: [{ title: "説明会", date: "2026-10-16" }] })[0]).toBe(
      "今日もいっしょにがんばろう",
    );
  });
});
