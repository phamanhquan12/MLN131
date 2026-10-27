import type { State, Command, Context, EndReason } from "./model";
import { BANK_VERSION, chooseQuestion, questionById } from "./questions";
import { createBoard } from "./board";
import { difficulty, outcome, seconds, terminalReason } from "./rules";
import { shuffle } from "./random";
export function initialState(): State {
  return {
    schemaVersion: 1,
    bankVersion: BANK_VERSION,
    phase: "SETUP",
    roundId: "",
    name: "",
    cash: 10_000,
    lives: 1,
    bonus: false,
    safeOpened: 0,
    board: null,
    flags: [],
    used: [],
    exposure: {},
    sequence: 0,
    ledger: [],
    turn: null,
    terminal: null,
    rng: { board: 1, question: 2, options: 3 },
  };
}
function settle(s: State, reason: EndReason, now: number): void {
  s.terminal = reason;
  if (!s.ledger.some((x) => x.roundId === s.roundId))
    s.ledger.push({
      roundId: s.roundId,
      name: s.name,
      cash: s.cash,
      reason,
      turns: s.used.length,
      at: now,
    });
}
function resolve(s: State, timeout: boolean, now: number): void {
  const t = s.turn!;
  const cell = s.board![t.cellId];
  const correct =
    !timeout && t.selected === questionById(t.questionId).correctOptionId;
  const result = outcome(
    cell.type,
    s.cash,
    s.lives,
    s.bonus,
    correct,
    timeout ? "timeout" : "answer",
  );
  s.cash = result.cash;
  s.lives = result.lives;
  s.bonus = result.bonus;
  t.result = result;
  cell.opened = true;
  if (cell.type !== "MINE") s.safeOpened++;
  s.phase = "FEEDBACK";
  const end = terminalReason(s.cash, s.lives, s.safeOpened);
  if (end) settle(s, end, now);
}
export function transition(
  state: State,
  command: Command,
  ctx: Context,
): State {
  const s = structuredClone(state),
    now = ctx.now,
    t = s.turn;
  switch (command.type) {
    case "START":
      if (s.phase !== "SETUP" && s.phase !== "FINISHED") return state;
      if (
        !command.roundId ||
        s.ledger.some((x) => x.roundId === command.roundId)
      )
        return state;
      return {
        ...initialState(),
        phase: "READY",
        name: command.name.trim().slice(0, 80) || "Người chơi",
        roundId: command.roundId,
        exposure: s.exposure,
        sequence: s.sequence,
        ledger: s.ledger,
        rng: {
          board: command.seed >>> 0,
          question: (command.seed ^ 0x9e3779b9) >>> 0,
          options: (command.seed ^ 0x85ebca6b) >>> 0,
        },
      };
    case "FLAG":
      if (
        s.phase !== "READY" ||
        !Number.isInteger(command.cellId) ||
        command.cellId < 0 ||
        command.cellId >= 25 ||
        s.board?.[command.cellId].opened
      )
        return state;
      s.flags = s.flags.includes(command.cellId)
        ? s.flags.filter((i) => i !== command.cellId)
        : [...s.flags, command.cellId];
      if (s.board)
        s.board[command.cellId].flagged = s.flags.includes(command.cellId);
      return s;
    case "OPEN": {
      if (
        s.phase !== "READY" ||
        !Number.isInteger(command.cellId) ||
        command.cellId < 0 ||
        command.cellId >= 25 ||
        s.flags.includes(command.cellId) ||
        s.board?.[command.cellId].opened
      )
        return state;
      if (!s.board) {
        s.board = (ctx.boardFactory ?? createBoard)(
          command.cellId,
          s.rng.board,
        );
        s.board.forEach((c, i) => (c.flagged = s.flags.includes(i)));
      }
      const level = difficulty(s.cash),
        choice = chooseQuestion(level, s.used, s.exposure, s.rng.question);
      s.rng.question = choice.seed;
      const order = shuffle(
        choice.question.options.map((o) => o.id),
        s.rng.options,
      );
      s.rng.options = order.seed;
      s.used.push(choice.question.id);
      s.sequence++;
      s.exposure[choice.question.id] = {
        count: (s.exposure[choice.question.id]?.count ?? 0) + 1,
        last: s.sequence,
      };
      s.turn = {
        id: `${s.roundId}:${s.used.length}`,
        cellId: command.cellId,
        questionId: choice.question.id,
        difficulty: level,
        cashBefore: s.cash,
        optionOrder: order.items,
        selected: null,
        activatedAt: null,
        deadline: null,
        remaining: seconds(level) * 1000,
        result: null,
      };
      s.phase = "PREPARING";
      return s;
    }
    case "CONTINUE":
      if (s.phase !== "FEEDBACK") return state;
      s.phase = s.terminal ? "FINISHED" : "READY";
      if (!s.terminal) s.turn = null;
      return s;
    case "CASHOUT":
      if (s.phase !== "READY" || !s.used.length || s.terminal) return state;
      settle(s, "CASHED_OUT", now);
      s.phase = "FINISHED";
      return s;
    default:
      if (!t || command.turnId !== t.id || s.terminal) return state;
      if (command.type === "ACTIVATE") {
        if (s.phase !== "PREPARING") return state;
        t.activatedAt = now;
        t.deadline = now + t.remaining;
        s.phase = "QUESTION_ACTIVE";
        return s;
      }
      if (command.type === "RESUME") {
        if (s.phase !== "PAUSED") return state;
        t.deadline = now + t.remaining;
        s.phase = "QUESTION_ACTIVE";
        return s;
      }
      if (s.phase !== "QUESTION_ACTIVE") return state;
      if (
        command.type === "SELECT" &&
        !t.optionOrder.includes(command.optionId)
      )
        return state;
      if (now >= t.deadline!) {
        resolve(s, true, now);
        return s;
      }
      if (command.type === "TIMEOUT") return state;
      if (command.type === "SELECT") {
        t.selected = command.optionId;
        return s;
      }
      if (command.type === "PAUSE") {
        t.remaining = t.deadline! - now;
        s.phase = "PAUSED";
        return s;
      }
      if (!t.selected) return state;
      resolve(s, false, now);
      return s;
  }
}
