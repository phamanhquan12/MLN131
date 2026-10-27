import { test, expect, type Page } from "@playwright/test";
import bank from "../src/data/questions.json" with { type: "json" };
import type { State } from "../src/domain/model";
const KEY = "mln131.session.v1";
async function snapshot(page: Page): Promise<State> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
}
async function cash(page: Page, n: number) {
  await expect(page.getByTestId("cash")).toHaveText(
    `${n.toLocaleString("vi-VN")}đ`,
  );
  expect((await snapshot(page)).cash).toBe(n);
}
async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox").fill("Người chơi E2E");
  await page
    .getByRole("button", { name: "Bắt đầu vòng chơi", exact: true })
    .click();
}
async function open(page: Page, cell: number) {
  await page.locator(`[data-cell="${cell}"]`).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
}
async function select(page: Page, correct = true) {
  const s = await snapshot(page),
    q = bank.questions.find((q) => q.id === s.turn!.questionId)!;
  const o = q.options.find((o) =>
    correct ? o.id === q.correctOptionId : o.id !== q.correctOptionId,
  )!;
  await page.locator(`input[type="radio"][value="${o.id}"]`).check();
}
async function submit(page: Page, correct = true) {
  await select(page, correct);
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tiếp tục", exact: true }),
  ).toBeVisible();
}
async function play(page: Page, cell: number, correct = true) {
  await open(page, cell);
  await submit(page, correct);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
}
async function dialog(
  page: Page,
  accept: boolean,
  action: () => Promise<unknown>,
) {
  page.once("dialog", (d) => (accept ? d.accept() : d.dismiss()));
  await action();
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-28T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-28T03:00:00Z"));
});
test("E01 setup, first safe, HUD visible", async ({ page }) => {
  await start(page);
  await cash(page, 10000);
  await expect(page.getByText("Hệ số x1,00")).toBeVisible();
  expect((await snapshot(page)).lives).toBe(1);
  await expect(page.locator(".cell")).toHaveCount(25);
  await open(page, 0);
  const s = await snapshot(page);
  expect(s.board![0].type).toBe("SAFE");
  await expect(page.getByTestId("cash")).toBeInViewport();
  expect(s.board!.filter((c) => c.opened)).toHaveLength(0);
});
test("E02 safe path thresholds and fixed timers", async ({ page }) => {
  await start(page);
  const expected = [
    [0, 1, 20, 18000],
    [1, 1, 20, 26000],
    [2, 2, 25, 42000],
    [3, 3, 25, 58000],
    [4, 3, 25, 74000],
    [5, 4, 30, 82000],
    [6, 4, 30, 90000],
    [7, 4, 30, 98000],
    [8, 4, 30, 106000],
    [9, 5, 30, 114000],
  ];
  for (const [cell, level, time, total] of expected) {
    await open(page, cell);
    const s = await snapshot(page);
    expect(s.turn!.difficulty).toBe(level);
    expect(s.turn!.deadline! - s.turn!.activatedAt!).toBe(time * 1000);
    await submit(page);
    await cash(page, total);
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  }
});
test("E03 wrong and timeout safe, explanation, duplicate submit", async ({
  page,
}) => {
  await start(page);
  await open(page, 0);
  await select(page, false);
  await page
    .getByRole("button", { name: "Xác nhận", exact: true })
    .evaluate((b) => {
      (b as HTMLButtonElement).click();
      (b as HTMLButtonElement).click();
    });
  await cash(page, 8800);
  const s = await snapshot(page);
  await expect(
    page.getByText(
      bank.questions.find((q) => q.id === s.turn!.questionId)!.explanation,
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await open(page, 4);
  await page.clock.fastForward(20000);
  await cash(page, 7744);
  expect((await snapshot(page)).lives).toBe(1);
});
test("E04 correct mine retains life, wrong last-life mine busts", async ({
  page,
}) => {
  await start(page);
  await play(page, 0);
  await play(page, 15);
  await cash(page, 9000);
  expect((await snapshot(page)).lives).toBe(1);
  await play(page, 16, false);
  await cash(page, 0);
  expect((await snapshot(page)).ledger).toHaveLength(1);
  await expect(page.getByRole("heading", { name: "Hết mạng" })).toBeVisible();
  await expect(page.locator(".cell:enabled")).toHaveCount(0);
});
test("E05 life rescue retains a playable life", async ({ page }) => {
  await start(page);
  await play(page, 0);
  await play(page, 5);
  await play(page, 15, false);
  await cash(page, 13000);
  expect((await snapshot(page)).lives).toBe(1);
  expect((await snapshot(page)).phase).toBe("READY");
  await open(page, 4);
});
test("E06 bonus chain, life, mine and wrong consume bonus", async ({
  page,
}) => {
  await start(page);
  await play(page, 0);
  await play(page, 1);
  await play(page, 2);
  await cash(page, 42000);
  await play(page, 5);
  await cash(page, 58000);
  expect((await snapshot(page)).lives).toBe(2);
  await play(page, 3);
  await play(page, 15);
  await cash(page, 33000);
  expect((await snapshot(page)).bonus).toBe(false);
  await play(page, 6, false);
  expect((await snapshot(page)).lives).toBe(2);
});
test("E07 cap, feedback then reload settles exactly once", async ({ page }) => {
  await start(page);
  for (let i = 0; i < 14; i++) await play(page, i);
  await open(page, 14);
  await submit(page);
  await cash(page, 150000);
  expect((await snapshot(page)).terminal).toBe("CAP_REACHED");
  expect((await snapshot(page)).ledger).toHaveLength(1);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.reload();
  await cash(page, 150000);
  expect((await snapshot(page)).ledger).toHaveLength(1);
  await expect(
    page.getByRole("heading", { name: "Chạm trần thưởng" }),
  ).toBeVisible();
});
test("E08 all mines then all safe including wrong safe ends below cap", async ({
  page,
}) => {
  await start(page);
  await play(page, 0, false);
  let expected = 8800;
  for (let i = 15; i < 25; i++) {
    await play(page, i);
    expected = Math.floor(expected / 2);
    await cash(page, expected);
  }
  let bonus = false;
  for (let i = 1; i < 15; i++) {
    expected += bonus ? 16000 : 8000;
    bonus = i <= 3;
    await play(page, i);
    await cash(page, expected);
  }
  expect(expected).toBe(136008);
  const s = await snapshot(page);
  expect(s.terminal).toBe("ALL_SAFE_OPENED");
  expect(s.ledger[0].cash).toBe(136008);
  expect(s.safeOpened).toBe(15);
});
test("E09 cashout cancel confirm reload and new round preserve session", async ({
  page,
}) => {
  await start(page);
  await play(page, 0);
  await dialog(page, false, () =>
    page.getByRole("button", { name: "Chốt 18.000đ", exact: true }).click(),
  );
  expect((await snapshot(page)).phase).toBe("READY");
  await dialog(page, true, () =>
    page.getByRole("button", { name: "Chốt 18.000đ", exact: true }).click(),
  );
  await page.reload();
  await cash(page, 18000);
  expect((await snapshot(page)).ledger).toHaveLength(1);
  await page
    .getByRole("button", { name: "Bắt đầu người chơi mới", exact: true })
    .click();
  await cash(page, 10000);
  expect((await snapshot(page)).sequence).toBe(1);
  await expect(page.getByText(/Tổng thưởng đã chốt: 18.000đ/)).toBeVisible();
});
test("E10 active reload selection and deadline, overdue restore once", async ({
  page,
}) => {
  await start(page);
  await open(page, 0);
  await select(page);
  const saved = await snapshot(page);
  await page.clock.fastForward(5000);
  await page.reload();
  const restored = await snapshot(page);
  expect(restored.turn).toEqual(saved.turn);
  await page.clock.setSystemTime(saved.turn!.deadline! + 1);
  await page.reload();
  await cash(page, 8800);
  expect((await snapshot(page)).turn!.result!.reason).toBe("timeout");
  await page.reload();
  await cash(page, 8800);
});
test("E11 pause clock advance reload resume", async ({ page }) => {
  await start(page);
  await open(page, 0);
  await page.clock.fastForward(5000);
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  const s = await snapshot(page);
  expect(s.turn!.remaining).toBe(15000);
  await page.clock.fastForward(60000);
  await page.reload();
  expect((await snapshot(page)).phase).toBe("PAUSED");
  await expect(
    page.getByRole("button", { name: "Xác nhận", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Tiếp tục đồng hồ", exact: true })
    .click();
  expect((await snapshot(page)).turn!.deadline).toBe(s.turn!.deadline! + 60000);
  await submit(page);
  await cash(page, 18000);
});
test("E12 exact deadline submit and repeated callbacks only timeout once", async ({
  page,
}) => {
  await start(page);
  await open(page, 0);
  await select(page);
  const s = await snapshot(page);
  await page.clock.setSystemTime(s.turn!.deadline!);
  await page
    .getByRole("button", { name: "Xác nhận", exact: true })
    .evaluate((b) => {
      (b as HTMLButtonElement).click();
      (b as HTMLButtonElement).click();
    });
  await cash(page, 8800);
  await page.clock.fastForward(500);
  await cash(page, 8800);
  expect((await snapshot(page)).sequence).toBe(1);
  expect((await snapshot(page)).turn!.result!.reason).toBe("timeout");
});
test("E13 26 short rounds use all 25 tier-1 questions before repeats", async ({
  page,
}) => {
  await start(page);
  const ids = new Set<string>();
  for (let i = 0; i < 26; i++) {
    await open(page, 0);
    const s = await snapshot(page);
    if (i < 25) expect(ids.has(s.turn!.questionId)).toBe(false);
    else expect(ids.has(s.turn!.questionId)).toBe(true);
    ids.add(s.turn!.questionId);
    await submit(page);
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await dialog(page, true, () =>
      page.getByRole("button", { name: "Chốt 18.000đ", exact: true }).click(),
    );
    if (i === 10) await page.reload();
    await page
      .getByRole("button", { name: "Bắt đầu người chơi mới", exact: true })
      .click();
  }
  expect((await snapshot(page)).ledger).toHaveLength(26);
  expect(ids.size).toBe(25);
});
test("E14 corrupt and incompatible snapshot have explicit recovery", async ({
  page,
}) => {
  await start(page);
  const raw = await snapshot(page);
  for (const value of ["{", JSON.stringify({ ...raw, bankVersion: "other" })]) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: KEY,
      value,
    });
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("khác phiên bản");
    await expect(page.locator(".board")).toHaveCount(0);
    await dialog(page, false, () =>
      page
        .getByRole("button", { name: "Phục hồi buổi mới", exact: true })
        .click(),
    );
    await expect(page.getByRole("alert")).toBeVisible();
    await dialog(page, true, () =>
      page
        .getByRole("button", { name: "Phục hồi buổi mới", exact: true })
        .click(),
    );
    await expect(
      page.getByRole("button", { name: "Bắt đầu vòng chơi", exact: true }),
    ).toBeVisible();
  }
});
test("E15 desktop/mobile HUD, keyboard, no external requests or console errors", async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:")) external.push(r.url());
  });
  await start(page);
  await open(page, 0);
  await expect(page.getByTestId("cash")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Xác nhận", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath("desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("radio").first().focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).focus();
  await expect(page.getByTestId("cash")).toBeInViewport();
  const hud = await page.locator(".hud").boundingBox(),
    submitBox = await page
      .getByRole("button", { name: "Xác nhận", exact: true })
      .boundingBox();
  expect(submitBox!.y).toBeGreaterThan(hud!.y + hud!.height);
  await page.screenshot({ path: test.info().outputPath("mobile.png") });
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Tiếp tục", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("E16 flag/unflag, zero cell opens no neighbors", async ({ page }) => {
  await start(page);
  await page.locator('[data-cell="0"]').click({ button: "right" });
  expect((await snapshot(page)).used).toHaveLength(0);
  await page.locator('[data-cell="0"]').click();
  expect((await snapshot(page)).phase).toBe("READY");
  await page.locator('[data-cell="0"]').click({ button: "right" });
  await play(page, 0);
  await expect(page.locator(".cell.opened")).toHaveCount(1);
  expect((await snapshot(page)).board![0].adjacent).toBe(0);
});
test("E17 public production contains no fixture adapter or query/global controls", async ({
  page,
  request,
}) => {
  const html = await (
    await request.get("http://127.0.0.1:4173/?fixture=true&seed=42")
  ).text();
  const js = html.match(/src="([^"]+\.js)"/)![1];
  const bundle = await (
    await request.get(new URL(js, "http://127.0.0.1:4173").href)
  ).text();
  expect(bundle).not.toContain("fixtureBoard");
  expect(bundle).not.toContain("testing/fixture");
  expect(bundle).not.toContain("fixture-");
  await page.goto("http://127.0.0.1:4173/?fixture=true&seed=42");
  expect(
    await page.evaluate(() =>
      Object.keys(window).filter((k) => /fixture|testControl|__mln/i.test(k)),
    ),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Bắt đầu vòng chơi", exact: true })
    .click();
  await open(page, 0);
  const s = await snapshot(page);
  expect(s.board!.filter((c) => c.type === "MINE")).toHaveLength(10);
});
test("E18 centered modal dims board, traps keyboard focus and cannot be dismissed", async ({
  page,
}) => {
  await start(page);
  await play(page, 0);
  await page.screenshot({ path: test.info().outputPath("board.png") });
  await open(page, 4);
  const modal = page.getByRole("dialog");
  await expect(modal).toHaveAttribute("aria-modal", "true");
  const box = await modal.boundingBox();
  expect(Math.abs(box!.x + box!.width / 2 - 640)).toBeLessThan(2);
  expect(
    await page.locator("main").evaluate((el) => (el as HTMLElement).inert),
  ).toBe(true);
  expect(
    await page
      .locator(".modal-backdrop")
      .evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toContain("blur");
  await page.keyboard.press("Escape");
  await expect(modal).toBeVisible();
  await page.locator(".modal-backdrop").click({ position: { x: 2, y: 300 } });
  await expect(modal).toBeVisible();
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeFocused();
  await submit(page);
  await expect(modal).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator(".cell:focus")).toHaveCount(1);
});
