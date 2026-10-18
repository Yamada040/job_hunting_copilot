import { describe, expect, it } from "vitest";

import {
  calendarMessages,
  companyListMessages,
  esListMessages,
  interviewListMessages,
  webtestListMessages,
} from "./guide-messages";

const today = "2026-10-13";

describe("esListMessages", () => {
  it("ESが無ければ、作るよう促す", () => {
    expect(esListMessages([], today)).toEqual(["最初のESを作ってみよう"]);
  });

  it("締切が近い下書きを、下書きの件数より先に話す", () => {
    const messages = esListMessages(
      [
        { status: "draft", deadline: "2026-10-14" },
        { status: "draft", deadline: null },
        { status: "submitted", deadline: "2026-10-14" },
      ],
      today,
    );
    expect(messages[0]).toBe("締切が近いESが1件あるよ");
    expect(messages[1]).toBe("下書きが2件。少しずつ仕上げよう");
  });
});

describe("companyListMessages", () => {
  it("面接中と内定の企業を、件数の前に話す", () => {
    const messages = companyListMessages([{ stage: "interviewing" }, { stage: "offered" }, { stage: "entered" }]);
    expect(messages.slice(0, 3)).toEqual(["面接中の企業が1社あるよ", "内定が1社！おめでとう", "3社を管理中"]);
  });
});

describe("interviewListMessages", () => {
  it("振り返りをしていないログがあれば、その件数を話す", () => {
    expect(interviewListMessages([{ reviewed: false }, { reviewed: true }])[0]).toBe("振り返りが1件待ってるよ");
    expect(interviewListMessages([{ reviewed: true }])[0]).toBe("振り返りはばっちり！");
  });
});

describe("calendarMessages", () => {
  it("7日以内の直近の予定を、今日・明日の言い方で話す", () => {
    const items = [
      { title: "二次面接", date: "2026-10-15", time: null },
      { title: "説明会", date: "2026-10-14", time: "10:00" },
    ];
    expect(calendarMessages(items, today)[0]).toBe("明日は「説明会」があるよ");
  });

  it("7日以内に予定が無ければ、空いていると話す", () => {
    expect(calendarMessages([{ title: "最終面接", date: "2026-11-30", time: null }], today)[0]).toBe(
      "1週間の予定は空いているよ",
    );
  });
});

describe("webtestListMessages", () => {
  it("問題が無ければ、作るよう促す", () => {
    expect(webtestListMessages(0)).toEqual(["最初の問題を作ってみよう"]);
    expect(webtestListMessages(4)[0]).toBe("4問そろっているよ");
  });
});
