import { it, expect } from "vitest";
import { initialState, transition } from "../../src/domain/engine";
import type { Command, State } from "../../src/domain/model";
import {
  active,
  answer,
  context,
  play,
  ready,
  step,
} from "../fixtures/helpers";
import { questionById } from "../../src/domain/questions";
const same = (s: State, c: Command, now = 1001) =>
  expect(step(s, c, now)).toBe(s);
it("rejects illegal phases, stale turn and invalid selections without penalties", () => {
  const setup = initialState();
  const commands: Command[] = [
    { type: "OPEN", cellId: 0 },
    { type: "FLAG", cellId: 0 },
    { type: "CASHOUT" },
    { type: "CONTINUE" },
    { type: "SUBMIT", turnId: "x" },
  ];
  commands.forEach((c) => same(setup, c));
  same(setup, { type: "START", name: "", seed: 1, roundId: "" });
  let s = ready();
  same(s, { type: "START", name: "x", seed: 1, roundId: "r" });
  same(s, { type: "CASHOUT" });
  for (const cellId of [-1, 25, 1.5]) {
    same(s, { type: "OPEN", cellId });
    same(s, { type: "FLAG", cellId });
  }
  s = active(s);
  const t = s.turn!;
  for (const c of [
    { type: "SUBMIT", turnId: t.id },
    { type: "RESUME", turnId: t.id },
    { type: "ACTIVATE", turnId: t.id },
    { type: "SELECT", turnId: t.id, optionId: "bad" },
    { type: "SELECT", turnId: "old", optionId: t.optionOrder[0] },
    { type: "TIMEOUT", turnId: t.id },
    { type: "OPEN", cellId: 1 },
    { type: "FLAG", cellId: 1 },
    { type: "CASHOUT" },
  ] as Command[])
    same(s, c);
  s = answer(s);
  same(s, { type: "SUBMIT", turnId: t.id });
  same(s, { type: "CASHOUT" });
  same(s, { type: "RESUME", turnId: t.id });
});
it("flags never reserve questions, zero does not flood, opened cells locked", () => {
  let s = ready();
  s = step(s, { type: "FLAG", cellId: 0 });
  same(s, { type: "OPEN", cellId: 0 });
  expect(s.used).toEqual([]);
  s = step(s, { type: "FLAG", cellId: 0 });
  s = play(s, 0);
  expect(s.board!.filter((c) => c.opened)).toHaveLength(1);
  expect(s.board![0].adjacent).toBe(0);
  same(s, { type: "OPEN", cellId: 0 });
  same(s, { type: "FLAG", cellId: 0 });
  s = step(s, { type: "FLAG", cellId: 1 });
  expect(s.board![1].flagged).toBe(true);
  s = step(s, { type: "FLAG", cellId: 1 });
  expect(s.board![1].flagged).toBe(false);
});
it("preparing reserves once, activation freezes deadline, bonus chains", () => {
  let s = step(ready(), { type: "OPEN", cellId: 0 });
  expect(s.phase).toBe("PREPARING");
  expect(s.sequence).toBe(1);
  same(s, { type: "OPEN", cellId: 1 });
  same(s, { type: "SUBMIT", turnId: s.turn!.id });
  s = step(s, { type: "ACTIVATE", turnId: s.turn!.id }, 1000);
  expect(s.turn!.deadline).toBe(26000);
  same(s, { type: "ACTIVATE", turnId: s.turn!.id }, 4000);
  s = step(answer(s), { type: "CONTINUE" });
  s = play(s, 1);
  expect([s.cash, s.bonus]).toEqual([49000, true]);
  s = play(s, 2);
  expect([s.cash, s.bonus]).toEqual([73000, true]);
  s = play(s, 5);
  expect([s.cash, s.lives, s.bonus]).toEqual([97000, 2, false]);
  s = play(s, 3);
  s = play(s, 18);
  expect([s.cash, s.bonus, s.lives]).toEqual([54500, false, 2]);
});
it.each([
  [-1, true],
  [0, false],
  [1, false],
])("submit deadline %+ims", (offset, correct) => {
  let s = active();
  const t = s.turn!;
  s = step(s, {
    type: "SELECT",
    turnId: t.id,
    optionId: questionById(t.questionId).correctOptionId,
  });
  s = step(s, { type: "SUBMIT", turnId: t.id }, 26000 + offset);
  expect(s.turn!.result!.correct).toBe(correct);
  expect(s.turn!.result!.reason).toBe(correct ? "answer" : "timeout");
  expect(s.cash).toBe(correct ? 37000 : 22000);
  same(s, { type: "TIMEOUT", turnId: t.id }, 30000);
  same(s, { type: "SUBMIT", turnId: t.id }, 30000);
  expect(s.sequence).toBe(1);
});
it("pause/resume preserves remaining; expired pause times out; select at deadline times out", () => {
  let s = active();
  s = step(s, { type: "PAUSE", turnId: s.turn!.id }, 6000);
  expect(s.turn!.remaining).toBe(20000);
  expect(s.phase).toBe("PAUSED");
  same(s, { type: "SUBMIT", turnId: s.turn!.id }, 100000);
  same(s, {
    type: "SELECT",
    turnId: s.turn!.id,
    optionId: s.turn!.optionOrder[0],
  });
  same(s, { type: "CASHOUT" });
  s = step(s, { type: "RESUME", turnId: s.turn!.id }, 100000);
  expect(s.turn!.deadline).toBe(120000);
  s = step(s, { type: "PAUSE", turnId: s.turn!.id }, 120000);
  expect(s.turn!.result!.reason).toBe("timeout");
  s = active();
  s = step(
    s,
    { type: "SELECT", turnId: s.turn!.id, optionId: s.turn!.optionOrder[0] },
    26000,
  );
  expect(s.cash).toBe(22000);
});
it("cap settles during feedback once and continue cannot reopen", () => {
  let s = ready();
  for (let i = 0; i < 8; i++) {
    s = answer(active(s, i));
    if (i < 7) s = step(s, { type: "CONTINUE" });
  }
  expect([s.cash, s.phase, s.terminal, s.ledger.length]).toEqual([
    150000,
    "FEEDBACK",
    "CAP_REACHED",
    1,
  ]);
  same(s, { type: "SUBMIT", turnId: s.turn!.id });
  same(s, { type: "OPEN", cellId: 20 });
  s = step(s, { type: "CONTINUE" });
  expect(s.phase).toBe("FINISHED");
  same(s, { type: "CONTINUE" });
  same(s, { type: "CASHOUT" });
  same(s, { type: "START", name: "x", seed: 1, roundId: s.roundId });
});
it("life rescue, mine correct keeps life, wrong gifts do not grant", () => {
  let s = play(ready(), 0);
  s = play(s, 5);
  expect(s.lives).toBe(2);
  s = play(s, 18, false);
  expect([s.cash, s.lives, s.terminal]).toEqual([24500, 1, null]);
  s = play(s, 19, true);
  expect([s.cash, s.lives]).toEqual([12250, 1]);
  s = play(s, 1, false);
  expect([s.cash, s.bonus, s.lives]).toEqual([10780, false, 1]);
  s = answer(active(s, 20), false);
  expect([s.cash, s.lives, s.terminal, s.ledger.length]).toEqual([
    0,
    0,
    "BUSTED",
    1,
  ]);
});
it("all safe opened despite wrong answer after every mine, independent total", () => {
  let s = play(ready(), 0, false);
  for (let i = 18; i < 25; i++) s = play(s, i);
  for (let i = 1; i < 18; i++) s = play(s, i, false);
  expect([s.cash, s.terminal, s.safeOpened, s.lives, s.ledger.length]).toEqual([
    16,
    "ALL_SAFE_OPENED",
    18,
    1,
    1,
  ]);
});
it("cashout and new round keep exposure ledger and reset board", () => {
  let s = play(ready(), 0);
  s = step(s, { type: "CASHOUT" });
  expect(s.ledger[0].cash).toBe(37000);
  const next = step(s, { type: "START", name: "  ", seed: 15, roundId: "r2" });
  expect([
    next.name,
    next.cash,
    next.lives,
    next.bonus,
    next.board,
    next.used,
  ]).toEqual(["Người chơi", 25000, 1, false, null, []]);
  expect(next.exposure).toEqual(s.exposure);
  expect(next.ledger).toEqual(s.ledger);
  const fresh = transition(
    initialState(),
    { type: "START", name: "x".repeat(100), seed: 2, roundId: "random" },
    context,
  );
  expect(fresh.name.length).toBe(80);
  const generated = transition(
    fresh,
    { type: "OPEN", cellId: 24 },
    { now: 1000 },
  );
  expect(generated.board![24].type).toBe("SAFE");
});
