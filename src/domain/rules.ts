import type { CellType, Difficulty, Outcome, EndReason } from "./model";
export const DEFAULT_RULES = {
  rows: 5,
  cols: 5,
  mineCount: 10,
  lifeGiftCount: 2,
  bonusGiftCount: 3,
  startingCashVnd: 10_000,
  cashCapVnd: 150_000,
  safeGainVnd: 8_000,
  boostedSafeGainVnd: 16_000,
  safeWrongKeepNumerator: 88,
  safeWrongKeepDenominator: 100,
  startingLives: 1,
  maxLives: 3,
  firstClickOrdinarySafe: true,
} as const;
export function difficulty(cash: number): Difficulty {
  return cash < 20_000
    ? 1
    : cash < 40_000
      ? 2
      : cash < 70_000
        ? 3
        : cash < 100_000
          ? 4
          : 5;
}
export function seconds(level: Difficulty): number {
  return [20, 25, 25, 30, 30][level - 1];
}
export function outcome(
  type: CellType,
  cash: number,
  lives: number,
  bonus: boolean,
  correct: boolean,
  reason: Outcome["reason"],
): Outcome {
  let next = cash,
    health = lives,
    gift = "";
  if (type === "MINE") {
    if (!correct && lives === 1) {
      next = 0;
      health = 0;
    } else {
      next = Math.floor(cash / 2);
      if (!correct) health--;
    }
  } else if (correct) {
    next = Math.min(150_000, cash + (bonus ? 16_000 : 8_000));
    if (type === "LIFE_GIFT") {
      health = Math.min(3, lives + 1);
      gift = "Thêm một mạng (tối đa 3)";
    }
    if (type === "BONUS_GIFT") gift = "Nhận bonus cho lượt kế tiếp";
  } else next = Math.floor((cash * 88) / 100);
  return {
    cash: next,
    lives: health,
    bonus: correct && type === "BONUS_GIFT",
    delta: next - cash,
    correct,
    reason,
    gift,
  };
}
export function terminalReason(
  cash: number,
  lives: number,
  safeOpened: number,
): EndReason | null {
  return lives === 0
    ? "BUSTED"
    : cash >= 150_000
      ? "CAP_REACHED"
      : safeOpened === 15
        ? "ALL_SAFE_OPENED"
        : null;
}
export const money = (cash: number): string =>
  `${cash.toLocaleString("vi-VN")}đ`;
export const multiplier = (cash: number): string =>
  `x${(cash / 10_000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
