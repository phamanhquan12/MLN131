import bank from "../../src/data/questions.json";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  getByRole,
  getByText,
  queryByText,
} from "@testing-library/dom";
import { mount } from "../../src/ui/view";
import { Controller } from "../../src/application/controller";
import { questionById } from "../../src/domain/questions";
import { money } from "../../src/domain/rules";
import { fixtureBoard } from "../../src/testing/fixture";
import { active, MemoryStore, play, ready } from "../fixtures/helpers";
import type { State } from "../../src/domain/model";
let store: MemoryStore,
  root: HTMLElement,
  now: number,
  app: ReturnType<typeof mount>,
  confirm: ReturnType<typeof vi.fn<(message: string) => boolean>>,
  download: ReturnType<typeof vi.fn<(raw: string) => void>>,
  id: number;
function render() {
  app?.destroy();
  app = mount(root, {
    store,
    now: () => now,
    seed: () => 42,
    roundId: () => `ui-${++id}`,
    boardFactory: fixtureBoard,
    confirm,
    download,
  });
  return app.controller;
}
function load(s: State) {
  store.value = JSON.stringify(s);
  return render();
}
function click(text: string) {
  fireEvent.click(getByRole(root, "button", { name: text }));
}
function open(cell: number) {
  fireEvent.click(root.querySelector(`[data-cell="${cell}"]`)!);
}
function select(correct = true) {
  const t = app.controller.state.turn!,
    q = questionById(t.questionId);
  fireEvent.click(
    getByRole(root, "radio", {
      name: new RegExp(
        (correct
          ? q.options.find((o) => o.id === q.correctOptionId)!
          : q.options.find((o) => o.id !== q.correctOptionId)!
        ).text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ),
    }),
  );
}
function complete(cell: number, correct = true) {
  open(cell);
  select(correct);
  click("Xác nhận");
  click("Tiếp tục");
}
function cash(expected: number) {
  expect(root.querySelector('[data-testid="cash"]')!.textContent).toBe(
    money(expected),
  );
  expect(app.controller.state.cash).toBe(expected);
  expect(JSON.parse(store.value!).cash).toBe(expected);
}
beforeEach(() => {
  vi.useFakeTimers();
  store = new MemoryStore();
  now = 1000;
  id = 0;
  confirm = vi.fn(() => true);
  download = vi.fn();
  root = document.createElement("div");
  document.body.append(root);
  render();
});
afterEach(() => {
  app.destroy();
  root.remove();
  vi.useRealTimers();
});
describe("real view + engine + storage", () => {
  it("full flow: name is text, selection changes without grading, HUD and snapshot agree", () => {
    const input = getByRole(root, "textbox");
    fireEvent.input(input, {
      target: { value: "<img src=x onerror=alert(1)>" },
    });
    fireEvent.submit(input.closest("form")!);
    expect(root.querySelector("img")).toBeNull();
    expect(root.textContent).toContain("<img src=x onerror=alert(1)>");
    cash(10000);
    open(0);
    const t = app.controller.state.turn!;
    expect(t.deadline).toBe(21000);
    select(false);
    select(true);
    cash(10000);
    expect(app.controller.state.sequence).toBe(1);
    click("Xác nhận");
    cash(18000);
    expect(root.textContent).toContain("+8.000đ · 10.000đ → 18.000đ");
    expect(root.textContent).toContain(questionById(t.questionId).explanation);
    app.controller.dispatch({ type: "SUBMIT", turnId: t.id });
    cash(18000);
    click("Tiếp tục");
    expect(getByRole(root, "button", { name: "Chốt 18.000đ" })).toBeTruthy();
  });
  it("bonus, consecutive bonus, life, mine, failed gift and life limit use engine", () => {
    load(play(ready(), 0));
    complete(1);
    cash(26000);
    complete(2);
    cash(42000);
    complete(5);
    cash(58000);
    expect(app.controller.state.lives).toBe(2);
    complete(3);
    cash(66000);
    complete(15);
    cash(33000);
    expect(app.controller.state.bonus).toBe(false);
    complete(6);
    expect(app.controller.state.lives).toBe(3);
    complete(16, false);
    cash(20500);
    expect(app.controller.state.lives).toBe(2);
  });
  it("bonus expires on wrong safe, gifts require correct answer", () => {
    load(play(play(ready(), 0), 1));
    complete(2, false);
    cash(22880);
    expect(app.controller.state.bonus).toBe(false);
    complete(5, false);
    expect(app.controller.state.lives).toBe(1);
  });
  it("life rescue then last-life mine loss settles once", () => {
    load(play(play(ready(), 0), 5));
    complete(15, false);
    cash(13000);
    expect(app.controller.state.lives).toBe(1);
    complete(16, false);
    cash(0);
    expect(app.controller.state.terminal).toBe("BUSTED");
    expect(app.controller.state.ledger).toHaveLength(1);
    render();
    expect(app.controller.state.ledger).toHaveLength(1);
  });
  it.each([false, true])(
    "timeout with selected=%s never submits a radio",
    (selected) => {
      load(active());
      if (selected) select();
      now = 21000;
      vi.advanceTimersByTime(100);
      cash(8800);
      expect(app.controller.state.turn!.result!.reason).toBe("timeout");
      expect(app.controller.state.lives).toBe(1);
      vi.advanceTimersByTime(1000);
      cash(8800);
    },
  );
  it("25000 wrong safe -> 22000 x2,20, thresholds frozen per turn", () => {
    const s = ready();
    s.cash = 25000;
    load(s);
    open(0);
    expect(app.controller.state.turn!.difficulty).toBe(2);
    expect(app.controller.state.turn!.deadline).toBe(26000);
    select(false);
    click("Xác nhận");
    cash(22000);
    expect(root.textContent).toContain("x2,20");
    click("Tiếp tục");
    complete(4, true);
    open(7);
    expect(app.controller.state.turn!.difficulty).toBe(2);
  });
  it("cap forecast and actual delta use +5000, auto-settlement locked during feedback", () => {
    const s = ready();
    s.cash = 145000;
    s.bonus = true;
    load(s);
    open(0);
    expect(root.textContent).toContain("Dự báo nếu đúng: 150.000đ (+5.000đ)");
    select();
    click("Xác nhận");
    cash(150000);
    expect(root.textContent).toContain("+5.000đ · 145.000đ → 150.000đ");
    expect(app.controller.state.ledger).toHaveLength(1);
    render();
    cash(150000);
    click("Tiếp tục");
    expect(root.textContent).toContain("Thưởng đã chốt: 150.000đ");
  });
  it("active reload preserves question, order, selection and deadline then expires once", () => {
    load(active());
    select();
    const saved = structuredClone(app.controller.state);
    now = 6000;
    render();
    expect(app.controller.state).toEqual(saved);
    now = 21001;
    render();
    cash(8800);
    const feedback = structuredClone(app.controller.state);
    render();
    expect(app.controller.state).toEqual(feedback);
  });
  it("pause and reload keep remaining, resume sets absolute deadline", () => {
    load(active());
    now = 6000;
    click("Tạm dừng");
    expect(app.controller.state.turn!.remaining).toBe(15000);
    now = 100000;
    render();
    expect(root.textContent).toContain("Dừng · 15s");
    app.controller.dispatch({
      type: "SUBMIT",
      turnId: app.controller.state.turn!.id,
    });
    cash(10000);
    click("Tiếp tục đồng hồ");
    expect(app.controller.state.turn!.deadline).toBe(115000);
  });
  it("cashout cancel/confirm and new round preserve history, reset requires confirmation", () => {
    load(play(ready(), 0));
    confirm.mockReturnValueOnce(false);
    click("Chốt 18.000đ");
    cash(18000);
    expect(app.controller.state.ledger).toHaveLength(0);
    click("Chốt 18.000đ");
    expect(confirm).toHaveBeenLastCalledWith("Chốt thưởng 18.000đ cho Minh?");
    expect(app.controller.state.ledger).toHaveLength(1);
    render();
    fireEvent.submit(root.querySelector("form")!);
    cash(10000);
    expect(app.controller.state.exposure).toEqual(
      JSON.parse(store.value!).exposure,
    );
    expect(app.controller.state.sequence).toBe(1);
    confirm.mockReturnValueOnce(false);
    click("Xóa dữ liệu buổi");
    expect(app.controller.state.sequence).toBe(1);
    click("Xóa dữ liệu buổi");
    expect(app.controller.state.phase).toBe("SETUP");
    expect(app.controller.state.ledger).toEqual([]);
  });
  it("save failure locks displayed state, retries candidate without replay", () => {
    load(active());
    select();
    store.fail = true;
    click("Xác nhận");
    expect(app.controller.state.cash).toBe(10000);
    expect(app.controller.candidate!.cash).toBe(18000);
    expect(getByRole(root, "alert").textContent).toContain("Chưa thể lưu");
    app.controller.dispatch({
      type: "SUBMIT",
      turnId: app.controller.state.turn!.id,
    });
    expect(app.controller.candidate!.cash).toBe(18000);
    click("Tải bản sao dữ liệu");
    expect(download).toHaveBeenCalled();
    store.fail = false;
    click("Thử lưu lại");
    cash(18000);
    expect(app.controller.state.sequence).toBe(1);
    app.controller.retry();
    cash(18000);
  });
  it.each(["{", JSON.stringify({ ...ready(), bankVersion: "incompatible" })])(
    "damaged snapshot enters explicit recovery: %s",
    (raw) => {
      store.value = raw;
      render();
      expect(getByRole(root, "alert")).toBeTruthy();
      expect(root.querySelector(".board")).toBeNull();
      click("Tải bản sao dữ liệu");
      expect(download).toHaveBeenCalledWith(raw);
      confirm.mockReturnValueOnce(false);
      click("Phục hồi buổi mới");
      expect(store.value).toBe(raw);
      click("Phục hồi buổi mới");
      expect(app.controller.state.phase).toBe("SETUP");
    },
  );
  it("read error and recovery write failure block play", () => {
    const c = new Controller(
      {
        getItem: () => {
          throw Error("Denied");
        },
        setItem: () => {
          throw Error("Denied");
        },
      },
      () => ({ now }),
      () => {},
    );
    expect(c.recovery).toBe(true);
    expect(c.raw).toBeNull();
    c.reset();
    expect(c.error).toContain("Chưa thể lưu");
    expect(c.candidate!.phase).toBe("SETUP");
  });
  it("flags toggle using mode and right mouse, zero reveals exactly one", () => {
    load(ready());
    click("⚑ Chế độ cắm cờ");
    open(0);
    expect(app.controller.state.used).toEqual([]);
    expect(root.textContent).toContain("⚑");
    click("⚑ Đang cắm cờ");
    open(0);
    expect(app.controller.state.phase).toBe("READY");
    fireEvent.contextMenu(root.querySelector('[data-cell="0"]')!);
    open(0);
    select();
    click("Xác nhận");
    click("Tiếp tục");
    expect(root.querySelectorAll(".cell.opened")).toHaveLength(1);
    expect(
      getByRole(root, "button", {
        name: "Hàng 1 cột 1: An toàn, 0 mìn liền kề",
      }),
    ).toBeTruthy();
  });
  it("gift and mine feedback include labels and result source; no unexpected nodes", () => {
    load(play(ready(), 0));
    open(1);
    select();
    click("Xác nhận");
    expect(getByText(root, "Nhận bonus cho lượt kế tiếp")).toBeTruthy();
    click("Tiếp tục");
    open(15);
    select();
    click("Xác nhận");
    expect(root.textContent).toContain("Còn 1 mạng.");
    expect(queryByText(root, "Hoàn thành câu hỏi để chốt thưởng")).toBeNull();
  });
  it("25 short rounds expose every tier-1 question before repetition", () => {
    load(ready());
    const seen = new Set<string>();
    for (let i = 0; i < 26; i++) {
      open(0);
      const id = app.controller.state.turn!.questionId;
      if (i < 25) expect(seen.has(id)).toBe(false);
      else expect(seen.has(id)).toBe(true);
      seen.add(id);
      select();
      click("Xác nhận");
      click("Tiếp tục");
      click("Chốt 18.000đ");
      fireEvent.submit(root.querySelector("form")!);
    }
    expect(seen.size).toBe(25);
    expect(app.controller.state.ledger).toHaveLength(26);
  });
});

it("blocks startup when the bundled bank is invalid", () => {
  const original = bank.questions;
  try {
    bank.questions = [];
    render();
    expect(root.textContent).toContain("Lỗi ngân hàng câu hỏi");
    expect(root.querySelector(".board")).toBeNull();
  } finally {
    bank.questions = original;
  }
});
it("opens an accessible modal, traps focus and restores the board after feedback", () => {
  load(ready());
  open(0);
  const dialog = getByRole(root, "dialog");
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(root.querySelector("main")!.inert).toBe(true);
  expect(document.body.classList.contains("modal-open")).toBe(true);
  expect(document.activeElement).toBe(dialog.querySelector("h2"));
  const first = dialog.querySelector<HTMLInputElement>('input[type="radio"]')!;
  const pause = getByRole(dialog, "button", { name: "Tạm dừng" });
  pause.focus();
  fireEvent.keyDown(pause, { key: "Tab" });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(pause);
  fireEvent.keyDown(pause, { key: "Escape" });
  fireEvent.click(root.querySelector(".modal-backdrop")!);
  expect(app.controller.state.phase).toBe("QUESTION_ACTIVE");
  dialog.scrollTop = 20;
  select();
  expect(getByRole(root, "dialog").scrollTop).toBe(20);
  click("Xác nhận");
  expect(getByRole(root, "dialog").scrollTop).toBe(0);
  expect(getByRole(root, "dialog")).toBeTruthy();
  click("Tiếp tục");
  expect(root.querySelector('[role="dialog"]')).toBeNull();
  expect(root.querySelector("main")!.inert).toBe(false);
  expect(document.body.classList.contains("modal-open")).toBe(false);
  expect(document.activeElement?.classList.contains("cell")).toBe(true);
});
