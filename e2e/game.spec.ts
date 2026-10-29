import { test, expect, type Page } from "@playwright/test";
import bank from "../src/data/questions.json" with { type: "json" };
import type { State } from "../src/domain/model";
const KEY = "vnr202.session.v2";
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
  await cash(page, 25000);
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
    [0, 1, 25, 37000],
    [1, 1, 25, 49000],
    [2, 2, 25, 73000],
    [3, 3, 30, 97000],
    [4, 4, 30, 121000],
    [5, 4, 30, 133000],
    [6, 5, 30, 145000],
    [7, 5, 30, 150000],
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
  await cash(page, 22000);
  const s = await snapshot(page);
  await expect(
    page.getByText(
      bank.questions.find((q) => q.id === s.turn!.questionId)!.explanation,
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await open(page, 4);
  await page.clock.fastForward(25000);
  await cash(page, 19360);
  expect((await snapshot(page)).lives).toBe(1);
});
test("E04 correct mine retains life, wrong last-life mine busts", async ({
  page,
}) => {
  await start(page);
  await play(page, 0);
  await play(page, 18);
  await cash(page, 18500);
  expect((await snapshot(page)).lives).toBe(1);
  await play(page, 19, false);
  await cash(page, 0);
  expect((await snapshot(page)).ledger).toHaveLength(1);
  await expect(page.getByRole("heading", { name: "Hết mạng" })).toBeVisible();
  await expect(page.locator(".cell:enabled")).toHaveCount(0);
});
test("E05 life rescue retains a playable life", async ({ page }) => {
  await start(page);
  await play(page, 0);
  await play(page, 5);
  await play(page, 18, false);
  await cash(page, 24500);
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
  await cash(page, 73000);
  await play(page, 5);
  await cash(page, 97000);
  expect((await snapshot(page)).lives).toBe(2);
  await play(page, 3);
  await play(page, 18);
  await cash(page, 54500);
  expect((await snapshot(page)).bonus).toBe(false);
  await open(page, 6);
  expect((await snapshot(page)).turn!.difficulty).toBe(2);
  await submit(page, false);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  expect((await snapshot(page)).lives).toBe(2);
});
test("E07 cap, feedback then reload settles exactly once", async ({ page }) => {
  await start(page);
  for (let i = 0; i < 7; i++) await play(page, i);
  await open(page, 7);
  await submit(page);
  await cash(page, 150000);
  expect((await snapshot(page)).terminal).toBe("CAP_REACHED");
  expect((await snapshot(page)).ledger).toHaveLength(1);
  expect((await snapshot(page)).lives).toBe(3);
  expect((await snapshot(page)).safeOpened).toBe(8);
  expect((await snapshot(page)).board![8].opened).toBe(false);
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
  let expected = 22000;
  for (let i = 18; i < 25; i++) {
    await play(page, i);
    expected = Math.floor(expected / 2);
    await cash(page, expected);
  }
  for (let i = 1; i < 18; i++) {
    expected = Math.floor((expected * 88) / 100);
    await play(page, i, false);
    await cash(page, expected);
  }
  expect(expected).toBe(16);
  const s = await snapshot(page);
  expect(s.terminal).toBe("ALL_SAFE_OPENED");
  expect(s.ledger[0].cash).toBe(16);
  expect(s.safeOpened).toBe(18);
  expect(s.lives).toBe(1);
});
test("E09 cashout cancel confirm reload and new round preserve session", async ({
  page,
}) => {
  await start(page);
  await play(page, 0);
  await dialog(page, false, () =>
    page.getByRole("button", { name: "Chốt 37.000đ", exact: true }).click(),
  );
  expect((await snapshot(page)).phase).toBe("READY");
  await dialog(page, true, () =>
    page.getByRole("button", { name: "Chốt 37.000đ", exact: true }).click(),
  );
  await page.reload();
  await cash(page, 37000);
  expect((await snapshot(page)).ledger).toHaveLength(1);
  await page
    .getByRole("button", { name: "Bắt đầu người chơi mới", exact: true })
    .click();
  await cash(page, 25000);
  expect((await snapshot(page)).sequence).toBe(1);
  await expect(page.getByText(/Tổng thưởng đã chốt: 37.000đ/)).toBeVisible();
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
  await cash(page, 22000);
  expect((await snapshot(page)).turn!.result!.reason).toBe("timeout");
  await page.reload();
  await cash(page, 22000);
});
test("E11 pause clock advance reload resume", async ({ page }) => {
  await start(page);
  await open(page, 0);
  await page.clock.fastForward(5000);
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  const s = await snapshot(page);
  expect(s.turn!.remaining).toBe(20000);
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
  await cash(page, 37000);
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
  await cash(page, 22000);
  await page.clock.fastForward(500);
  await cash(page, 22000);
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
      page.getByRole("button", { name: "Chốt 37.000đ", exact: true }).click(),
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
  expect(s.board!.filter((c) => c.type === "MINE")).toHaveLength(7);
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
test("E19 old-course snapshot requires migration; new active round survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "mln131.session.v1",
      JSON.stringify({
        schemaVersion: 1,
        bankVersion: "legacy",
        phase: "QUESTION_ACTIVE",
        cash: 98000,
        used: ["legacy-question"],
      }),
    );
    localStorage.setItem("unrelated-app", "keep");
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Đã cập nhật sang VNR202",
  );
  await expect(page.locator(".board")).toHaveCount(0);
  await dialog(page, false, () =>
    page.getByRole("button", { name: "Bắt đầu VNR202", exact: true }).click(),
  );
  await expect(page.getByRole("alert")).toBeVisible();
  await dialog(page, true, () =>
    page.getByRole("button", { name: "Bắt đầu VNR202", exact: true }).click(),
  );
  await page
    .getByRole("button", { name: "Bắt đầu vòng chơi", exact: true })
    .click();
  await cash(page, 25000);
  await open(page, 0);
  const state = await snapshot(page);
  expect(state.exposure[state.turn!.questionId].count).toBe(1);
  expect(state.courseId).toBe("VNR202");
  expect(state.board!.filter((c) => c.type === "MINE")).toHaveLength(7);
  await page.reload();
  expect((await snapshot(page)).turn).toEqual(state.turn);
  expect(
    await page.evaluate(() => localStorage.getItem("mln131.session.v1")),
  ).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("unrelated-app"))).toBe(
    "keep",
  );
});
