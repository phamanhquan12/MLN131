import { it, expect } from "vitest";
import bank from "../../src/data/questions.json";
import { createBoard, adjacency } from "../../src/domain/board";
import type { CellType, Difficulty } from "../../src/domain/model";
import {
  chooseQuestion,
  questionById,
  questions,
  validateBank,
} from "../../src/domain/questions";
import { shuffle } from "../../src/domain/random";
it("all first positions and 1000 fixed seeds preserve counts and bounds", () => {
  for (let seed = 0; seed < 1000; seed++) {
    for (let first = 0; first < 25; first++) {
      const b = createBoard(first, seed);
      expect(b).toHaveLength(25);
      expect(b[first].type).toBe("SAFE");
      expect(
        ["MINE", "SAFE", "LIFE_GIFT", "BONUS_GIFT"].map(
          (t) => b.filter((c) => c.type === t).length,
        ),
      ).toEqual([7, 13, 2, 3]);
      expect(
        b.every(
          (c) => c.adjacent >= 0 && c.adjacent <= 8 && !c.opened && !c.flagged,
        ),
      ).toBe(true);
    }
  }
  expect(createBoard(4, 123)).toEqual(createBoard(4, 123));
  expect(
    new Set(
      Array.from({ length: 20 }, (_, s) => JSON.stringify(createBoard(0, s))),
    ).size,
  ).toBeGreaterThan(1);
});
it("independent neighbors: corners, edges, center, no row wrap, gifts excluded", () => {
  const b: CellType[] = Array(25).fill("SAFE");
  for (const i of [1, 5, 6, 9, 13, 19]) b[i] = "MINE";
  b[12] = "LIFE_GIFT";
  expect(adjacency(b, 0)).toBe(3);
  expect(adjacency(b, 4)).toBe(1);
  expect(adjacency(b, 10)).toBe(2);
  expect(adjacency(b, 14)).toBe(3);
  expect(adjacency(b, 12)).toBe(2);
  expect(adjacency(b, 24)).toBe(1);
});
it("validates real 125 bank", () => {
  expect(() => validateBank(bank)).not.toThrow();
  expect(questions).toHaveLength(125);
  expect(() => questionById("missing")).toThrow();
});
it("rejects malformed bank variants", () => {
  const variants: unknown[] = [
    null,
    [],
    { ...bank, schemaVersion: 1 },
    { ...bank, bankVersion: "" },
    { ...bank, questions: [] },
    { ...bank, questions: null },
  ];
  const mutate = (f: (b: typeof bank) => void) => {
    const b = structuredClone(bank);
    f(b);
    variants.push(b);
  };
  mutate((b) => (b.questions[0].difficulty = 0));
  mutate((b) => (b.questions[0].difficulty = 6));
  mutate((b) => (b.questions[0].difficulty = 1.5));
  mutate((b) => (b.questions[0].prompt = " "));
  mutate((b) => (b.questions[0].sourceRef = ""));
  mutate((b) => (b.questions[0].explanation = ""));
  mutate((b) => (b.questions[1].id = b.questions[0].id));
  mutate((b) => b.questions[0].options.pop());
  mutate((b) => (b.questions[0].options[0].text = ""));
  mutate((b) => (b.questions[0].options[0].id = ""));
  mutate((b) => (b.questions[0].options[1].id = b.questions[0].options[0].id));
  mutate(
    (b) =>
      (b.questions[0].options[1].text = `  ${b.questions[0].options[0].text}  `),
  );
  mutate((b) => (b.questions[0].correctOptionId = "x"));
  mutate((b) => (b.questions[0].difficulty = 2));
  mutate((b) => {
    b.questions[0].difficulty = 2;
    b.questions[0].familyId = "vnr-family-extra";
  });
  for (const v of variants) expect(() => validateBank(v)).toThrow();
});
it("selects 25 unique questions per level, then explicitly errors", () => {
  for (let level = 1; level <= 5; level++) {
    const used: string[] = [];
    let seed = 12;
    for (let n = 0; n < 25; n++) {
      const result = chooseQuestion(level as Difficulty, used, {}, seed);
      expect(result.question.difficulty).toBe(level);
      used.push(result.question.id);
      seed = result.seed;
    }
    expect(new Set(used).size).toBe(25);
    expect(() => chooseQuestion(level as Difficulty, used, {}, seed)).toThrow();
  }
});
it("exposure prioritizes unseen then least count then oldest", () => {
  const pool = questions.filter((q) => q.difficulty === 1);
  const exposure = Object.fromEntries(
    pool.map((q, i) => [q.id, { count: 2, last: i + 10 }]),
  );
  delete exposure[pool[13].id];
  expect(chooseQuestion(1, [], exposure, 1).question.id).toBe(pool[13].id);
  exposure[pool[13].id] = { count: 1, last: 99 };
  expect(chooseQuestion(1, [], exposure, 1).question.id).toBe(pool[13].id);
  exposure[pool[13].id] = { count: 2, last: 99 };
  expect(chooseQuestion(1, [], exposure, 1).question.id).toBe(pool[0].id);
});
it("all 24 option permutations preserve IDs, contents and grading", () => {
  const q = questions[0],
    permutations = new Set<string>();
  for (let seed = 0; seed < 2000; seed++) {
    const order = shuffle(q.options, seed).items;
    permutations.add(order.map((o) => o.id).join(","));
    expect(order.find((o) => o.id === q.correctOptionId)).toEqual(
      q.options.find((o) => o.id === q.correctOptionId),
    );
    expect([...order].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      q.options,
    );
  }
  const expected = [
    "o1,o2,o3,o4",
    "o1,o2,o4,o3",
    "o1,o3,o2,o4",
    "o1,o3,o4,o2",
    "o1,o4,o2,o3",
    "o1,o4,o3,o2",
    "o2,o1,o3,o4",
    "o2,o1,o4,o3",
    "o2,o3,o1,o4",
    "o2,o3,o4,o1",
    "o2,o4,o1,o3",
    "o2,o4,o3,o1",
    "o3,o1,o2,o4",
    "o3,o1,o4,o2",
    "o3,o2,o1,o4",
    "o3,o2,o4,o1",
    "o3,o4,o1,o2",
    "o3,o4,o2,o1",
    "o4,o1,o2,o3",
    "o4,o1,o3,o2",
    "o4,o2,o1,o3",
    "o4,o2,o3,o1",
    "o4,o3,o1,o2",
    "o4,o3,o2,o1",
  ];
  expect([...permutations].sort()).toEqual(expected.sort());
  expect(shuffle([], 1).items).toEqual([]);
});

it("fixture adapter keeps first click ordinary safe when a gift or mine is chosen", async () => {
  const { fixtureBoard } = await import("../../src/testing/fixture");
  for (const i of [1, 5, 18]) {
    const b = fixtureBoard(i);
    expect(b[i].type).toBe("SAFE");
    expect(b.filter((c) => c.type === "SAFE")).toHaveLength(13);
  }
});
it("enforces VNR metadata, IDs, format and per-level families", () => {
  for (const change of [
    (b: typeof bank) => (b.courseId = "MLN131"),
    (b: typeof bank) => (b.bankVersion = "old"),
    (b: typeof bank) => (b.questions[0].id = "legacy-question"),
    (b: typeof bank) => (b.questions[0].familyId = "legacy-family"),
    (b: typeof bank) => (b.questions[0].format = "unsupported"),
    (b: typeof bank) => (b.questions[1].familyId = b.questions[0].familyId),
  ]) {
    const invalid = structuredClone(bank);
    change(invalid);
    expect(() => validateBank(invalid)).toThrow();
  }
  for (let d = 1; d <= 5; d++)
    expect(
      new Set(
        questions.filter((q) => q.difficulty === d).map((q) => q.familyId),
      ).size,
    ).toBe(25);
});
it("mixed difficulty selection excludes previously used families, never falls back", () => {
  const used: string[] = [];
  let seed = 123;
  for (let n = 0; n < 25; n++) {
    const level = ((n % 5) + 1) as Difficulty;
    const result = chooseQuestion(level, used, {}, seed);
    expect(result.question.difficulty).toBe(level);
    expect(used.map((id) => questionById(id).familyId)).not.toContain(
      result.question.familyId,
    );
    used.push(result.question.id);
    seed = result.seed;
  }
  expect(new Set(used.map((id) => questionById(id).familyId)).size).toBe(25);
  expect(() => chooseQuestion(1, used, {}, seed)).toThrow();
});
it("reference VNR board adjacency and first-click distribution are independent", async () => {
  const { fixtureBoard } = await import("../../src/testing/fixture");
  const b = fixtureBoard(0);
  expect([b[0].adjacent, b[15].adjacent, b[17].adjacent]).toEqual([0, 2, 4]);
});
