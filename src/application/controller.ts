import type { Command, Context, State } from "../domain/model";
import { initialState, transition } from "../domain/engine";
import { parseSnapshot, readableLedger } from "./snapshot";
export const STORAGE_KEY = "mln131.session.v1";
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class Controller {
  state: State = initialState();
  candidate: State | null = null;
  error: string | null = null;
  raw: string | null = null;
  recovery = false;
  constructor(
    private store: Store,
    private context: () => Context,
    private changed: () => void,
  ) {
    try {
      this.raw = store.getItem(STORAGE_KEY);
      if (this.raw !== null) this.state = parseSnapshot(this.raw);
    } catch {
      this.error =
        "Dữ liệu buổi không đọc được hoặc khác phiên bản. Hãy tải bản sao trước khi phục hồi.";
      this.recovery = true;
    }
  }
  dispatch(command: Command): void {
    if (this.error) return;
    const candidate = transition(this.state, command, this.context());
    if (candidate !== this.state) this.commit(candidate);
  }
  private commit(candidate: State): void {
    try {
      const raw = JSON.stringify(candidate);
      this.store.setItem(STORAGE_KEY, raw);
      this.raw = raw;
      this.state = candidate;
      this.candidate = null;
      this.error = null;
    } catch {
      this.candidate = candidate;
      this.error = "Chưa thể lưu dữ liệu. Vòng chơi đã khóa; hãy thử lưu lại.";
    }
    this.changed();
  }
  retry(): void {
    if (this.candidate) this.commit(this.candidate);
  }
  reset(): void {
    this.recovery = false;
    this.commit(initialState());
  }
  recover(): void {
    const next = initialState();
    next.ledger = readableLedger(this.raw);
    this.recovery = false;
    this.commit(next);
  }
  restoreDeadline(): void {
    const t = this.state.turn;
    if (t && this.state.phase === "QUESTION_ACTIVE")
      this.dispatch({ type: "TIMEOUT", turnId: t.id });
  }
}
