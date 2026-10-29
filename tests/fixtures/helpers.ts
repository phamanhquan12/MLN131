import { STORAGE_KEY } from "../../src/application/controller";
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
  records = new Map<string, string>();
  fail = false;
  removeFail = false;
  get value(): string | null {
    return this.getItem(STORAGE_KEY);
  }
  set value(value: string | null) {
    if (value === null) this.records.delete(STORAGE_KEY);
    else this.records.set(STORAGE_KEY, value);
  }
  getItem(key: string): string | null {
    return this.records.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.fail) throw Error("Quota");
    this.records.set(key, value);
  }
  removeItem(key: string): void {
    if (this.removeFail) throw Error("Denied");
    this.records.delete(key);
  }
}
