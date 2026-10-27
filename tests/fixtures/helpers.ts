import type { Command, State } from "../../src/domain/model";
import { initialState, transition } from "../../src/domain/engine";
import { questionById } from "../../src/domain/questions";
import { fixtureBoard } from "../../src/testing/fixture";
export const context = { now: 1000, boardFactory: fixtureBoard };
export function step(s: State, c: Command, now = 1000): State {
  return transition(s, c, { ...context, now });
}
export function ready(): State {
  return step(initialState(), {
    type: "START",
    name: "Minh",
    seed: 42,
    roundId: "round-1",
  });
}
export function active(s = ready(), cellId = 0, now = 1000): State {
  s = step(s, { type: "OPEN", cellId }, now);
  return step(s, { type: "ACTIVATE", turnId: s.turn!.id }, now);
}
export function answer(s: State, correct = true, now = 1001): State {
  const t = s.turn!,
    q = questionById(t.questionId);
  s = step(
    s,
    {
      type: "SELECT",
      turnId: t.id,
      optionId: correct
        ? q.correctOptionId
        : q.options.find((o) => o.id !== q.correctOptionId)!.id,
    },
    now,
  );
  return step(s, { type: "SUBMIT", turnId: t.id }, now);
}
export function play(s: State, cellId: number, correct = true): State {
  return step(answer(active(s, cellId), correct), { type: "CONTINUE" });
}
export class MemoryStore {
  value: string | null = null;
  fail = false;
  getItem(): string | null {
    return this.value;
  }
  setItem(_key: string, value: string): void {
    if (this.fail) throw Error("Quota");
    this.value = value;
  }
}
