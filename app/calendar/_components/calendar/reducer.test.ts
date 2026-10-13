import { describe, expect, it } from "vitest";

import { emptyForm, modalReducer, type ModalState } from "./reducer";
import type { CalendarEvent } from "./types";

const closed: ModalState = {
  view: null,
  selectedDate: "2026-10-13",
  selectedEvent: null,
  formState: { ...emptyForm },
  deletingId: null,
  error: null,
};

const event: CalendarEvent = {
  id: "e1",
  date: "2026-10-20",
  title: "一次面接",
  type: "interview",
  time: "15:00",
  company: "サンプル",
  companyId: "c1",
};

describe("modalReducer", () => {
  it("日付の空いたところを押すと、その日の空の作成画面を開く", () => {
    const state = modalReducer(
      { ...closed, formState: { ...emptyForm, title: "前の入力" } },
      {
        type: "openCreate",
        date: "2026-10-15",
      },
    );
    expect(state.view).toBe("create");
    expect(state.selectedDate).toBe("2026-10-15");
    expect(state.formState.title).toBe("");
  });

  it("予定を押すと詳細を開き、編集に移ると予定の中身を入力欄に入れる", () => {
    const detail = modalReducer(closed, { type: "openDetail", event });
    expect(detail.view).toBe("detail");
    expect(detail.selectedEvent).toBe(event);

    const edit = modalReducer(detail, { type: "startEdit", event });
    expect(edit.view).toBe("edit");
    expect(edit.selectedDate).toBe("2026-10-20");
    expect(edit.formState).toEqual({
      title: "一次面接",
      type: "interview",
      time: "15:00",
      company: { id: "c1", name: "サンプル" },
    });
  });

  it("保存できたら閉じ、失敗したら開いたまま理由を出す", () => {
    const open = modalReducer(closed, { type: "openCreate", date: "2026-10-15" });
    expect(modalReducer(open, { type: "saveFailed", message: "保存に失敗しました" })).toMatchObject({
      view: "create",
      error: "保存に失敗しました",
    });
    expect(modalReducer(open, { type: "saveSuccess" }).view).toBeNull();
  });
});
