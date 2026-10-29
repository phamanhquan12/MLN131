import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, getByRole } from "@testing-library/dom";
import {
  Controller,
  LEGACY_STORAGE_KEY,
} from "../../src/application/controller";
import { parseSnapshot, readableLedger } from "../../src/application/snapshot";
import { mount } from "../../src/ui/view";
import { MemoryStore, active, ready } from "../fixtures/helpers";
import { fixtureBoard } from "../../src/testing/fixture";
const legacy = JSON.stringify({
  schemaVersion: 1,
  bankVersion: "legacy",
  phase: "QUESTION_ACTIVE",
  cash: 99999,
  used: ["legacy-question"],
  exposure: { "legacy-question": { count: 7, last: 7 } },
  ledger: [{ roundId: "legacy", cash: 99999 }],
});
const create = (store: MemoryStore) =>
  new Controller(
    store,
    () => ({ now: 1000, boardFactory: fixtureBoard }),
    () => {},
  );
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});
it("legacy course/schema cannot be parsed or used as a VNR ledger", () => {
  expect(() => parseSnapshot(legacy)).toThrow();
  expect(readableLedger(legacy)).toEqual([]);
  for (const change of [
    { courseId: "MLN131" },
    { schemaVersion: 1 },
    { bankVersion: "old" },
  ])
    expect(() =>
      parseSnapshot(JSON.stringify({ ...ready(), ...change })),
    ).toThrow();
});
it("requires confirmation, only removes the exact app namespace and starts clean", () => {
  vi.useFakeTimers();
  const store = new MemoryStore();
  store.records.set(LEGACY_STORAGE_KEY, legacy);
  store.records.set("unrelated-app", "keep me");
  const root = document.createElement("div");
  document.body.append(root);
  const confirm = vi.fn(() => false);
  const app = mount(root, {
    store,
    now: () => 1000,
    seed: () => 42,
    roundId: () => "vnr-round",
    boardFactory: fixtureBoard,
    confirm,
    download: () => {},
  });
  try {
    expect(getByRole(root, "alert").textContent).toContain(
      "Đã cập nhật sang VNR202",
    );
    expect(root.querySelector(".board")).toBeNull();
    app.controller.dispatch({
      type: "START",
      name: "blocked",
      seed: 1,
      roundId: "bad",
    });
    expect(store.value).toBeNull();
    fireEvent.click(getByRole(root, "button", { name: "Bắt đầu VNR202" }));
    expect(store.getItem(LEGACY_STORAGE_KEY)).toBe(legacy);
    confirm.mockReturnValue(true);
    fireEvent.click(getByRole(root, "button", { name: "Bắt đầu VNR202" }));
    expect(store.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(store.getItem("unrelated-app")).toBe("keep me");
    fireEvent.submit(root.querySelector("form")!);
    fireEvent.click(root.querySelector('[data-cell="0"]')!);
    const state = app.controller.state;
    expect(state.courseId).toBe("VNR202");
    expect(state.schemaVersion).toBe(2);
    expect(state.cash).toBe(25000);
    expect(state.board!.filter((c) => c.type === "MINE")).toHaveLength(7);
    expect(state.sequence).toBe(1);
    expect(state.ledger).toEqual([]);
    expect(state.used.every((id) => id.startsWith("vnr-"))).toBe(true);
    const restored = create(store);
    expect(restored.state).toEqual(state);
    expect(restored.error).toBeNull();
  } finally {
    app.destroy();
  }
});
it("write failure locks migration, retry persists the same candidate once", () => {
  const store = new MemoryStore();
  store.records.set(LEGACY_STORAGE_KEY, legacy);
  const c = create(store);
  store.fail = true;
  c.recover();
  expect(c.error).toContain("Chưa thể lưu");
  expect(c.migrationPending).toBe(true);
  expect(store.value).toBeNull();
  expect(store.getItem(LEGACY_STORAGE_KEY)).toBe(legacy);
  expect(c.state.sequence).toBe(0);
  store.fail = false;
  c.retry();
  expect(c.error).toBeNull();
  expect(c.migrationPending).toBe(false);
  expect(c.state.cash).toBe(25000);
  expect(c.state.exposure).toEqual({});
  expect(store.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  c.retry();
  expect(create(store).state).toEqual(c.state);
});
it("cleanup failure stays blocked and reload resumes cleanup without resetting VNR", () => {
  const store = new MemoryStore();
  store.value = JSON.stringify(active());
  store.records.set(LEGACY_STORAGE_KEY, legacy);
  store.removeFail = true;
  const c = create(store);
  expect(c.error).toContain("cập nhật");
  const saved = structuredClone(c.state);
  c.retry();
  expect(c.error).not.toBeNull();
  expect(store.getItem(LEGACY_STORAGE_KEY)).toBe(legacy);
  const reloaded = create(store);
  expect(reloaded.state).toEqual(saved);
  store.removeFail = false;
  reloaded.retry();
  expect(reloaded.error).toBeNull();
  expect(reloaded.state).toEqual(saved);
  expect(store.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  expect(create(store).state).toEqual(saved);
});
it("a valid new round wins over leftover legacy data; failed cleanup never regrades", () => {
  const store = new MemoryStore();
  store.value = JSON.stringify(active());
  store.records.set(LEGACY_STORAGE_KEY, legacy);
  const c = create(store);
  expect(c.state.used).toHaveLength(1);
  expect(c.error).toBeNull();
  expect(store.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  expect(create(store).state).toEqual(c.state);
});
