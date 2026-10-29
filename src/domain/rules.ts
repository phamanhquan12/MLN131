import type { CellType, Difficulty, Outcome, EndReason } from "./model";
export const RULES = {
  rows: 5,
  cols: 5,
  mineCount: 7,
  ordinarySafeCount: 13,
  safeTotal: 18,
  lifeGiftCount: 2,
  bonusGiftCount: 3,
  startingCashVnd: 25_000,
  multiplierBaseVnd: 25_000,
  cashCapVnd: 150_000,
  safeGainVnd: 12_000,
  boostedSafeGainVnd: 24_000,
  safeWrongKeepNumerator: 88,
  safeWrongKeepDenominator: 100,
  startingLives: 1,
  maxLives: 3,
  firstClickOrdinarySafe: true,
} as const;
export function difficulty(cash: number): Difficulty {
  return cash < 40_000
    ? 1
    : cash < 65_000
      ? 2
      : cash < 95_000
        ? 3
        : cash < 125_000
          ? 4
          : 5;
}
export function seconds(level: Difficulty): number {
  return [25, 25, 30, 30, 30][level - 1];
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
    next = Math.min(
      RULES.cashCapVnd,
      cash + (bonus ? RULES.boostedSafeGainVnd : RULES.safeGainVnd),
    );
    if (type === "LIFE_GIFT") {
      health = Math.min(RULES.maxLives, lives + 1);
      gift = "Thêm một mạng (tối đa 3)";
    }
    if (type === "BONUS_GIFT") gift = "Nhận bonus cho lượt kế tiếp";
  } else
    next = Math.floor(
      (cash * RULES.safeWrongKeepNumerator) / RULES.safeWrongKeepDenominator,
    );
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
    : cash >= RULES.cashCapVnd
      ? "CAP_REACHED"
      : safeOpened === RULES.safeTotal
        ? "ALL_SAFE_OPENED"
        : null;
}
export const money = (cash: number): string =>
  `${cash.toLocaleString("vi-VN")}đ`;
export const multiplier = (cash: number): string =>
  `x${(cash / RULES.multiplierBaseVnd).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
