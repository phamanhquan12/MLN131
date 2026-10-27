export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type CellType = "SAFE" | "MINE" | "LIFE_GIFT" | "BONUS_GIFT";
export type Phase =
  | "SETUP"
  | "READY"
  | "PREPARING"
  | "QUESTION_ACTIVE"
  | "PAUSED"
  | "FEEDBACK"
  | "FINISHED";
export type EndReason =
  "BUSTED" | "CAP_REACHED" | "ALL_SAFE_OPENED" | "CASHED_OUT";
export interface Question {
  id: string;
  difficulty: Difficulty;
  topic: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  sourceRef: string;
}
export interface Cell {
  type: CellType;
  opened: boolean;
  flagged: boolean;
  adjacent: number;
}
export interface Exposure {
  count: number;
  last: number;
}
export interface Outcome {
  cash: number;
  lives: number;
  bonus: boolean;
  delta: number;
  correct: boolean;
  reason: "answer" | "timeout";
  gift: string;
}
export interface Turn {
  id: string;
  cellId: number;
  questionId: string;
  difficulty: Difficulty;
  cashBefore: number;
  optionOrder: string[];
  selected: string | null;
  activatedAt: number | null;
  deadline: number | null;
  remaining: number;
  result: Outcome | null;
}
export interface Settlement {
  roundId: string;
  name: string;
  cash: number;
  reason: EndReason;
  turns: number;
  at: number;
}
export interface State {
  schemaVersion: 1;
  bankVersion: string;
  phase: Phase;
  roundId: string;
  name: string;
  cash: number;
  lives: number;
  bonus: boolean;
  safeOpened: number;
  board: Cell[] | null;
  flags: number[];
  used: string[];
  exposure: Record<string, Exposure>;
  sequence: number;
  ledger: Settlement[];
  turn: Turn | null;
  terminal: EndReason | null;
  rng: { board: number; question: number; options: number };
}
export type Command =
  | { type: "START"; name: string; seed: number; roundId: string }
  | { type: "OPEN" | "FLAG"; cellId: number }
  | {
      type: "ACTIVATE" | "SUBMIT" | "TIMEOUT" | "PAUSE" | "RESUME";
      turnId: string;
    }
  | { type: "SELECT"; turnId: string; optionId: string }
  | { type: "CONTINUE" | "CASHOUT" };
export interface Context {
  now: number;
  boardFactory?: (first: number, seed: number) => Cell[];
}
