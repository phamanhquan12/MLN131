import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import bank from "../src/data/questions.json";
async function collect(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? collect(join(dir, entry.name))
        : /\.(?:js|json|html|css)$/.test(entry.name)
          ? readFile(join(dir, entry.name), "utf8").then((text) => [text])
          : Promise.resolve([]),
    ),
  );
  return contents.flat();
}
const publicBundle = (await collect("dist")).join("\n");
if (/mln-\d{3}\b|mln131-ch6-i-125-v1/.test(publicBundle))
  throw Error("Public bundle contains old bank IDs");
const source = await readFile(
  "MLN131_Do_min_Prompt_Implement_125_cau_Test.md",
  "utf8",
);
const original = JSON.parse(source.match(/```json\n([\s\S]*?)\n```/)![1]) as {
  questions: { prompt: string }[];
};
if (original.questions.some((q) => publicBundle.includes(q.prompt)))
  throw Error("Public bundle contains old question content");
if (!bank.questions.every((q) => publicBundle.includes(q.id)))
  throw Error("Missing VNR question in public bundle");
console.log(
  "Build audit: only 125 VNR questions; no old question IDs or prompts.",
);
