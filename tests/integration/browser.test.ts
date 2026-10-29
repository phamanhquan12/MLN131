import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, getByRole } from "@testing-library/dom";
import { STORAGE_KEY } from "../../src/application/controller";
import { play, ready, step } from "../fixtures/helpers";
import { readableLedger } from "../../src/application/snapshot";
let stop: () => void = () => {};
afterEach(() => {
  stop();
  document.body.replaceChildren();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("mln131.session.v1");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});
it("browser entry uses secure random, saves, sound, confirmation and download adapters", async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  const sound = vi.fn(() => Promise.resolve());
  vi.stubGlobal(
    "Audio",
    class {
      play = sound;
    },
  );
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn(() => "blob:session");
      static revokeObjectURL = vi.fn();
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const { application } = await import("../../src/main");
  stop = application.destroy;
  const root = document.querySelector<HTMLElement>("#app")!;
  fireEvent.submit(root.querySelector("form")!);
  expect(application.controller.state.roundId).toBeTruthy();
  fireEvent.click(getByRole(root, "button", { name: "Âm thanh: tắt" }));
  fireEvent.click(root.querySelector('[data-cell="0"]')!);
  fireEvent.click(root.querySelector("input[type=radio]")!);
  fireEvent.submit(root.querySelector("form")!);
  expect(sound).toHaveBeenCalledTimes(1);
  fireEvent.click(getByRole(root, "button", { name: "Tiếp tục" }));
  fireEvent.click(
    getByRole(root, "button", {
      name: `Chốt ${application.controller.state.cash.toLocaleString("vi-VN")}đ`,
    }),
  );
  expect(confirm).toHaveBeenCalled();
  fireEvent.click(getByRole(root, "button", { name: "Âm thanh: bật" }));
  application.destroy();
  localStorage.setItem(STORAGE_KEY, "{");
  vi.resetModules();
  const remount = await import("../../src/main");
  stop = remount.application.destroy;
  fireEvent.click(getByRole(root, "button", { name: "Tải bản sao dữ liệu" }));
  expect(URL.createObjectURL).toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:session");
});
it("incompatible bank recovery preserves independently readable settled history", async () => {
  const settled = step(play(ready(), 0), { type: "CASHOUT" });
  const raw = JSON.stringify({ ...settled, bankVersion: "old" });
  expect(readableLedger(raw)).toEqual(settled.ledger);
  expect(readableLedger(null)).toEqual([]);
  expect(readableLedger("{")).toEqual([]);
  vi.useFakeTimers();
  localStorage.setItem(STORAGE_KEY, raw);
  document.body.innerHTML = '<div id="app"></div>';
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const { application } = await import("../../src/main");
  stop = application.destroy;
  fireEvent.click(
    getByRole(document.body, "button", { name: "Phục hồi buổi mới" }),
  );
  expect(application.controller.state.ledger).toEqual(settled.ledger);
  expect(application.controller.state.phase).toBe("SETUP");
});
