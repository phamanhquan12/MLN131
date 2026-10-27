import { describe, it, expect } from "vitest";
import {
  outcome,
  difficulty,
  seconds,
  terminalReason,
  money,
  multiplier,
  DEFAULT_RULES,
} from "../../src/domain/rules";
import type { CellType } from "../../src/domain/model";
describe("independent money vectors", () => {
  const vectors: [
    CellType,
    number,
    number,
    boolean,
    boolean,
    number,
    number,
    boolean,
    string | null,
  ][] = [
    ["SAFE", 10000, 1, false, true, 18000, 1, false, null],
    ["SAFE", 25000, 1, false, false, 22000, 1, false, null],
    ["SAFE", 25001, 1, false, false, 22000, 1, false, null],
    ["MINE", 25001, 2, false, true, 12500, 2, false, null],
    ["MINE", 25001, 2, false, false, 12500, 1, false, null],
    ["MINE", 25000, 1, false, false, 0, 0, false, "BUSTED"],
    ["BONUS_GIFT", 10000, 1, false, true, 18000, 1, true, null],
    ["SAFE", 25000, 1, true, true, 41000, 1, false, null],
    ["SAFE", 25000, 1, true, false, 22000, 1, false, null],
    ["MINE", 25000, 1, true, true, 12500, 1, false, null],
    ["BONUS_GIFT", 25000, 1, true, true, 41000, 1, true, null],
    ["LIFE_GIFT", 25000, 1, true, true, 41000, 2, false, null],
    ["LIFE_GIFT", 25000, 1, false, false, 22000, 1, false, null],
    ["SAFE", 145000, 1, true, true, 150000, 1, false, "CAP_REACHED"],
  ];
  it.each(vectors)(
    "%s C=%i lives=%i bonus=%s correct=%s",
    (type, cash, lives, bonus, correct, expected, health, pending, end) => {
      const r = outcome(type, cash, lives, bonus, correct, "answer");
      expect([r.cash, r.lives, r.bonus, r.delta]).toEqual([
        expected,
        health,
        pending,
        expected - cash,
      ]);
      expect(terminalReason(r.cash, r.lives, 0)).toBe(end);
    },
  );
  it("covers full correct/wrong/timeout cross product with independent arithmetic", () => {
    for (const type of ["SAFE", "MINE", "LIFE_GIFT", "BONUS_GIFT"] as const)
      for (const bonus of [false, true])
        for (const lives of [1, 2, 3])
          for (const mode of ["correct", "wrong", "timeout"])
            for (const cash of [0, 1, 25001, 149999]) {
              const correct = mode === "correct",
                r = outcome(
                  type,
                  cash,
                  lives,
                  bonus,
                  correct,
                  mode === "timeout" ? "timeout" : "answer",
                );
              const expected =
                type === "MINE"
                  ? !correct && lives === 1
                    ? 0
                    : Math.trunc(cash / 2)
                  : correct
                    ? Math.min(150000, cash + (bonus ? 16000 : 8000))
                    : Math.trunc(cash * 0.88);
              expect(r.cash).toBe(expected);
              expect(r.lives).toBe(
                type === "MINE" && !correct
                  ? lives - 1
                  : type === "LIFE_GIFT" && correct
                    ? Math.min(3, lives + 1)
                    : lives,
              );
              expect(r.bonus).toBe(type === "BONUS_GIFT" && correct);
            }
  });
  it.each([
    [0, 1],
    [19999, 1],
    [20000, 2],
    [39999, 2],
    [40000, 3],
    [69999, 3],
    [70000, 4],
    [99999, 4],
    [100000, 5],
    [149999, 5],
  ])("threshold %i", (cash, level) => expect(difficulty(cash)).toBe(level));
  it("timers, priority and display", () => {
    expect([1, 2, 3, 4, 5].map((l) => seconds(l as 1 | 2 | 3 | 4 | 5))).toEqual(
      [20, 25, 25, 30, 30],
    );
    expect(terminalReason(150000, 0, 15)).toBe("BUSTED");
    expect(terminalReason(150000, 1, 15)).toBe("CAP_REACHED");
    expect(terminalReason(120000, 1, 15)).toBe("ALL_SAFE_OPENED");
    expect(money(25000)).toBe("25.000đ");
    expect(multiplier(19999)).toBe("x2,00");
    expect(DEFAULT_RULES.mineCount).toBe(10);
  });
});
