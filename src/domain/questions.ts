import bank from "../data/questions.json";
import type { Difficulty, Exposure, Question } from "./model";
import { random } from "./random";
export const BANK_VERSION = "vnr202-1954-1965-hard-125-v1";
export const COURSE_ID = "VNR202";
export const SCHEMA_VERSION = 2;
export const questions = bank.questions as Question[];
export function validateBank(value: unknown): asserts value is typeof bank {
  if (!value || typeof value !== "object")
    throw Error("Ngân hàng không phải object");
  const b = value as typeof bank;
  if (
    b.schemaVersion !== SCHEMA_VERSION ||
    b.courseId !== COURSE_ID ||
    b.bankVersion !== BANK_VERSION ||
    typeof b.bankVersion !== "string" ||
    !b.bankVersion ||
    !Array.isArray(b.questions) ||
    b.questions.length !== 125
  )
    throw Error("Sai phiên bản hoặc số lượng câu");
  const ids = new Set<string>(),
    counts = [0, 0, 0, 0, 0];
  const families = Array.from({ length: 5 }, () => new Set<string>());
  for (const q of b.questions) {
    if (
      !q ||
      !Number.isInteger(q.difficulty) ||
      q.difficulty < 1 ||
      q.difficulty > 5
    )
      throw Error("Sai tầng");
    for (const field of [
      "id",
      "topic",
      "prompt",
      "explanation",
      "sourceRef",
    ] as const)
      if (typeof q[field] !== "string" || !q[field].trim())
        throw Error("Thiếu nội dung câu");
    if (
      !/^vnr-/.test(q.id) ||
      !/^vnr-family-/.test(q.familyId) ||
      ![
        "reasoning",
        "paired-claims",
        "error-diagnosis",
        "case-analysis",
        "integrated-claims",
      ].includes(q.format)
    )
      throw Error("Sai ID VNR, family hoặc format");
    if (families[q.difficulty - 1].has(q.familyId))
      throw Error("Trùng family trong tầng");
    families[q.difficulty - 1].add(q.familyId);
    if (ids.has(q.id)) throw Error("Trùng ID");
    ids.add(q.id);
    counts[q.difficulty - 1]++;
    if (!Array.isArray(q.options) || q.options.length !== 4)
      throw Error("Cần bốn phương án");
    const optionIds = new Set<string>(),
      texts = new Set<string>();
    for (const o of q.options) {
      if (
        !o ||
        typeof o.id !== "string" ||
        !o.id.trim() ||
        typeof o.text !== "string" ||
        !o.text.trim()
      )
        throw Error("Phương án rỗng");
      optionIds.add(o.id);
      texts.add(o.text.trim().replace(/\s+/g, " ").toLowerCase());
    }
    if (
      optionIds.size !== 4 ||
      texts.size !== 4 ||
      !optionIds.has(q.correctOptionId)
    )
      throw Error("Phương án trùng hoặc đáp án không hợp lệ");
  }
  if (counts.some((c) => c !== 25)) throw Error("Mỗi tầng phải có 25 câu");
}
export function chooseQuestion(
  level: Difficulty,
  used: string[],
  exposure: Record<string, Exposure>,
  seed: number,
): { question: Question; seed: number } {
  const usedFamilies = new Set(used.map((id) => questionById(id).familyId));
  const candidates = questions.filter(
    (q) =>
      q.difficulty === level &&
      !used.includes(q.id) &&
      !usedFamilies.has(q.familyId),
  );
  if (!candidates.length)
    throw Error("Hết câu đúng tầng: dữ liệu không hợp lệ");
  const score = (q: Question) => exposure[q.id] ?? { count: 0, last: -1 };
  candidates.sort(
    (a, b) => score(a).count - score(b).count || score(a).last - score(b).last,
  );
  const best = score(candidates[0]);
  const tied = candidates.filter(
    (q) => score(q).count === best.count && score(q).last === best.last,
  );
  const [r, next] = random(seed);
  return { question: tied[Math.floor(r * tied.length)], seed: next };
}
export function questionById(id: string): Question {
  const q = questions.find((q) => q.id === id);
  if (!q) throw Error("Không tìm thấy câu hỏi");
  return q;
}
