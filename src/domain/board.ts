import type { Cell, CellType } from "./model";
import { shuffle } from "./random";
export function adjacency(types: CellType[], index: number): number {
  let count = 0;
  const row = Math.floor(index / 5),
    col = index % 5;
  for (let r = Math.max(0, row - 1); r <= Math.min(4, row + 1); r++)
    for (let c = Math.max(0, col - 1); c <= Math.min(4, col + 1); c++)
      if ((r !== row || c !== col) && types[r * 5 + c] === "MINE") count++;
  return count;
}
export function createBoard(first: number, seed: number): Cell[] {
  const rest = shuffle<CellType>(
    [
      ...Array<CellType>(10).fill("MINE"),
      ...Array<CellType>(2).fill("LIFE_GIFT"),
      ...Array<CellType>(3).fill("BONUS_GIFT"),
      ...Array<CellType>(9).fill("SAFE"),
    ],
    seed,
  ).items;
  const types = Array.from({ length: 25 }, (_, i) =>
    i === first ? "SAFE" : rest.shift()!,
  );
  return types.map((type, i) => ({
    type,
    opened: false,
    flagged: false,
    adjacent: adjacency(types, i),
  }));
}
