import { z } from "zod";
import type { State } from "../domain/model";
import { BANK_VERSION, questionById, questions } from "../domain/questions";
import { adjacency } from "../domain/board";
import { difficulty, seconds, terminalReason } from "../domain/rules";
const int = z.number().int().nonnegative();
const cash = int.max(150_000),
  timestamp = z.number().nonnegative().finite();
const reason = z.enum([
  "BUSTED",
  "CAP_REACHED",
  "ALL_SAFE_OPENED",
  "CASHED_OUT",
]);
const result = z
  .object({
    cash,
    lives: int.max(3),
    bonus: z.boolean(),
    delta: z.number().int(),
    correct: z.boolean(),
    reason: z.enum(["answer", "timeout"]),
    gift: z.string(),
  })
  .strict();
const schema = z
  .object({
    schemaVersion: z.literal(1),
    bankVersion: z.literal(BANK_VERSION),
    phase: z.enum([
      "SETUP",
      "READY",
      "PREPARING",
      "QUESTION_ACTIVE",
      "PAUSED",
      "FEEDBACK",
      "FINISHED",
    ]),
    roundId: z.string(),
    name: z.string().max(80),
    cash,
    lives: int.max(3),
    bonus: z.boolean(),
    safeOpened: int.max(15),
    board: z
      .array(
        z
          .object({
            type: z.enum(["SAFE", "MINE", "LIFE_GIFT", "BONUS_GIFT"]),
            opened: z.boolean(),
            flagged: z.boolean(),
            adjacent: int.max(8),
          })
          .strict(),
      )
      .length(25)
      .nullable(),
    flags: z.array(int.max(24)),
    used: z.array(z.string()).max(25),
    exposure: z.record(
      z.string(),
      z.object({ count: int.positive(), last: int.positive() }).strict(),
    ),
    sequence: int,
    ledger: z.array(
      z
        .object({
          roundId: z.string().min(1),
          name: z.string(),
          cash,
          reason,
          turns: int.max(25),
          at: timestamp,
        })
        .strict(),
    ),
    turn: z
      .object({
        id: z.string(),
        cellId: int.max(24),
        questionId: z.string(),
        difficulty: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
        ]),
        cashBefore: cash,
        optionOrder: z.array(z.string()).length(4),
        selected: z.string().nullable(),
        activatedAt: timestamp.nullable(),
        deadline: timestamp.nullable(),
        remaining: timestamp.max(30_000),
        result: result.nullable(),
      })
      .strict()
      .nullable(),
    terminal: reason.nullable(),
    rng: z
      .object({
        board: int.max(4294967295),
        question: int.max(4294967295),
        options: int.max(4294967295),
      })
      .strict(),
  })
  .strict();
function requireValid(condition: unknown): asserts condition {
  if (!condition) throw Error("Snapshot có dữ liệu không nhất quán");
}
export function parseSnapshot(raw: string): State {
  const s = schema.parse(JSON.parse(raw));
  requireValid(
    new Set(s.flags).size === s.flags.length &&
      new Set(s.used).size === s.used.length,
  );
  requireValid(
    new Set(s.ledger.map((x) => x.roundId)).size === s.ledger.length,
  );
  const validIds = new Set(questions.map((q) => q.id));
  requireValid(
    Object.keys(s.exposure).every((id) => validIds.has(id)) &&
      Object.values(s.exposure).every((e) => e.last <= s.sequence),
  );
  requireValid(
    Object.values(s.exposure).reduce((n, e) => n + e.count, 0) === s.sequence,
  );
  requireValid(
    s.used.every((id) => validIds.has(id) && s.exposure[id]?.count > 0),
  );
  if (s.board) {
    const types = s.board.map((c) => c.type);
    requireValid(
      ["MINE", "SAFE", "LIFE_GIFT", "BONUS_GIFT"].every(
        (type, i) =>
          types.filter((t) => t === type).length === [10, 10, 2, 3][i],
      ),
    );
    requireValid(
      s.board.every(
        (c, i) =>
          c.adjacent === adjacency(types, i) &&
          c.flagged === s.flags.includes(i) &&
          !(c.flagged && c.opened),
      ),
    );
    requireValid(
      s.board.filter((c) => c.opened && c.type !== "MINE").length ===
        s.safeOpened,
    );
    const unresolved = ["PREPARING", "QUESTION_ACTIVE", "PAUSED"].includes(
      s.phase,
    )
      ? 1
      : 0;
    requireValid(
      s.board.filter((c) => c.opened).length === s.used.length - unresolved,
    );
  } else requireValid(s.used.length === 0 && s.safeOpened === 0);
  if (s.turn) {
    const t = s.turn,
      q = questionById(t.questionId);
    requireValid(
      s.board &&
        t.id === `${s.roundId}:${s.used.length}` &&
        s.used.at(-1) === q.id &&
        q.difficulty === t.difficulty &&
        difficulty(t.cashBefore) === t.difficulty,
    );
    requireValid(
      new Set(t.optionOrder).size === 4 &&
        t.optionOrder.every((id) => q.options.some((o) => o.id === id)) &&
        (t.selected === null || t.optionOrder.includes(t.selected)),
    );
    requireValid(
      t.remaining > 0 && t.remaining <= seconds(t.difficulty) * 1000,
    );
    if (["PREPARING", "QUESTION_ACTIVE", "PAUSED"].includes(s.phase))
      requireValid(
        s.cash === t.cashBefore &&
          !s.board![t.cellId].opened &&
          !s.flags.includes(t.cellId),
      );
    if (s.phase === "PREPARING")
      requireValid(t.deadline === null && t.activatedAt === null && !t.result);
    if (s.phase === "QUESTION_ACTIVE" || s.phase === "PAUSED")
      requireValid(
        t.deadline !== null &&
          t.activatedAt !== null &&
          t.deadline >= t.activatedAt &&
          !t.result,
      );
    if (s.phase === "FEEDBACK" || s.phase === "FINISHED")
      requireValid(
        t.result &&
          t.result.cash === s.cash &&
          t.result.lives === s.lives &&
          t.result.bonus === s.bonus &&
          t.result.delta === s.cash - t.cashBefore &&
          s.board![t.cellId].opened,
      );
  }
  requireValid(
    ["PREPARING", "QUESTION_ACTIVE", "PAUSED", "FEEDBACK"].includes(s.phase) ===
      Boolean(s.turn && s.phase !== "FINISHED"),
  );
  if (s.phase === "READY" || s.phase === "SETUP")
    requireValid(!s.turn && !s.terminal);
  if (s.phase === "SETUP")
    requireValid(
      !s.roundId &&
        !s.board &&
        s.cash === 10_000 &&
        s.lives === 1 &&
        !s.bonus &&
        s.flags.length === 0,
    );
  else requireValid(Boolean(s.roundId));
  requireValid((s.lives === 0) === (s.terminal === "BUSTED"));
  const entry = s.ledger.find((x) => x.roundId === s.roundId);
  if (s.terminal) {
    requireValid(
      (s.phase === "FEEDBACK" || s.phase === "FINISHED") &&
        entry &&
        entry.cash === s.cash &&
        entry.reason === s.terminal &&
        entry.turns === s.used.length,
    );
    if (s.terminal !== "CASHED_OUT")
      requireValid(
        terminalReason(s.cash, s.lives, s.safeOpened) === s.terminal,
      );
  } else
    requireValid(
      !entry &&
        s.phase !== "FINISHED" &&
        terminalReason(s.cash, s.lives, s.safeOpened) === null,
    );
  return s;
}

// Recover only independently validated settled records; never guess an unfinished prize.
export function readableLedger(raw: string | null): State["ledger"] {
  try {
    const value = z
      .object({ ledger: schema.shape.ledger })
      .parse(JSON.parse(raw ?? "null"));
    const unique = new Map(value.ledger.map((entry) => [entry.roundId, entry]));
    return [...unique.values()];
  } catch {
    return [];
  }
}
