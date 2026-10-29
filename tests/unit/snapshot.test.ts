import { it, expect } from "vitest";
import type { State } from "../../src/domain/model";
import { parseSnapshot } from "../../src/application/snapshot";
import { initialState } from "../../src/domain/engine";
import { active, answer, play, ready, step } from "../fixtures/helpers";
const parse = (s: State) => parseSnapshot(JSON.stringify(s));
it("roundtrips every reachable phase, flag, terminal and all safe outcomes", () => {
  const states = [initialState(), ready()];
  let s = step(ready(), { type: "FLAG", cellId: 4 });
  states.push(s);
  s = active(s);
  states.push(s);
  states.push(step(s, { type: "PAUSE", turnId: s.turn!.id }, 2000));
  s = answer(s);
  states.push(s);
  s = step(s, { type: "CONTINUE" });
  s = step(s, { type: "FLAG", cellId: 4 });
  states.push(s);
  states.push(step(s, { type: "CASHOUT" }));
  states.push(step(s, { type: "OPEN", cellId: 1 }));
  for (let i = 1; i < 8; i++) {
    s = answer(active(s, i));
    states.push(s);
    s = step(s, { type: "CONTINUE" });
    states.push(s);
  }
  let busted = play(ready(), 0);
  busted = answer(active(busted, 18), false);
  states.push(busted, step(busted, { type: "CONTINUE" }));
  for (const state of states) expect(parse(state)).toEqual(state);
});
it("rejects corruption, incompatible versions and inconsistent invariants", () => {
  for (const raw of ["{", "null", "[]", "{}"])
    expect(() => parseSnapshot(raw)).toThrow();
  const bad: State[] = [];
  const mutate = (base: State, change: (s: State) => void) => {
    const s = structuredClone(base);
    change(s);
    bad.push(s);
  };
  mutate(ready(), (s) => (s.cash = -1));
  mutate(ready(), (s) => (s.cash = 1.5));
  mutate(ready(), (s) => (s.bankVersion = "other"));
  mutate(ready(), (s) => (s.lives = 0));
  mutate(ready(), (s) => (s.safeOpened = 1));
  mutate(ready(), (s) => (s.flags = [1, 1]));
  mutate(ready(), (s) => (s.roundId = ""));
  mutate(initialState(), (s) => (s.roundId = "bad"));
  mutate(ready(), (s) => (s.exposure["unknown"] = { count: 1, last: 1 }));
  mutate(ready(), (s) => (s.exposure["vnr-1-01"] = { count: 1, last: 2 }));
  mutate(ready(), (s) => (s.sequence = 1));
  const a = active();
  mutate(a, (s) => s.used.push(s.used[0]));
  mutate(a, (s) => (s.exposure = {}));
  mutate(a, (s) => s.board!.pop());
  mutate(a, (s) => (s.board![1].type = "SAFE"));
  mutate(a, (s) => (s.board![0].adjacent = 8));
  mutate(a, (s) => (s.board![0].flagged = true));
  mutate(a, (s) => (s.board![0].opened = true));
  mutate(a, (s) => (s.board = null));
  mutate(a, (s) => (s.turn!.questionId = "missing"));
  mutate(a, (s) => (s.turn!.optionOrder = ["o1", "o1", "o3", "o4"]));
  mutate(a, (s) => (s.turn!.optionOrder = ["bad", "o2", "o3", "o4"]));
  mutate(a, (s) => (s.turn!.selected = "bad"));
  mutate(a, (s) => (s.turn!.difficulty = 2));
  mutate(a, (s) => (s.turn!.id = "old"));
  mutate(a, (s) => (s.turn!.remaining = 30000));
  mutate(a, (s) => (s.turn!.deadline = null));
  mutate(a, (s) => (s.turn = null));
  mutate(a, (s) => (s.phase = "READY"));
  const prep = step(ready(), { type: "OPEN", cellId: 0 });
  mutate(prep, (s) => (s.turn!.deadline = 2000));
  const feedback = answer(a);
  mutate(feedback, (s) => (s.turn!.result!.cash = 1));
  mutate(feedback, (s) => (s.turn!.result = null));
  const finished = step(play(ready(), 0), { type: "CASHOUT" });
  mutate(finished, (s) => s.ledger.push(s.ledger[0]));
  mutate(finished, (s) => (s.ledger[0].cash = 1));
  mutate(finished, (s) => (s.terminal = "CAP_REACHED"));
  mutate(finished, (s) => (s.terminal = null));
  mutate(ready(), (s) => (s.phase = "FINISHED"));
  for (const s of bad) expect(() => parse(s)).toThrow();
});
it("rejects changed active cash, zero paused duration and resolving an open cell", () => {
  const a = active();
  for (const change of [
    (s: State) => (s.cash = 11000),
    (s: State) => (s.turn!.remaining = 0),
    (s: State) => (s.turn!.deadline = 1),
  ]) {
    const bad = structuredClone(a);
    change(bad);
    expect(() => parse(bad)).toThrow();
  }
});
it("rejects two distinct question IDs of the same family across levels", async () => {
  const { questions, questionById } =
    await import("../../src/domain/questions");
  const first = play(ready(), 0);
  first.cash = 49000;
  const state = active(first, 4);
  const id = state.turn!.questionId;
  const replacement = questions.find(
    (q) =>
      q.difficulty === 2 && q.familyId === questionById(state.used[0]).familyId,
  )!;
  state.used[1] = replacement.id;
  state.turn!.questionId = replacement.id;
  delete state.exposure[id];
  state.exposure[replacement.id] = { count: 1, last: 2 };
  expect(() => parse(state)).toThrow("không nhất quán");
});
