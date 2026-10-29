import { adjacency } from "../domain/board";
import type { Cell, CellType } from "../domain/model";
// Compile-time e2e adapter. Vite removes this import from the public build.
export function fixtureBoard(first: number): Cell[] {
  const types: CellType[] = Array.from({ length: 25 }, (_, i) =>
    i >= 18
      ? "MINE"
      : i >= 1 && i <= 3
        ? "BONUS_GIFT"
        : i === 5 || i === 6
          ? "LIFE_GIFT"
          : "SAFE",
  );
  if (types[first] !== "SAFE")
    [types[0], types[first]] = [types[first], types[0]];
  return types.map((type, i) => ({
    type,
    opened: false,
    flagged: false,
    adjacent: adjacency(types, i),
  }));
}
