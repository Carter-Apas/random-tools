import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const revision = "60b5059f4782080b1b254ac6cca46bb5eb4902ea";
const base = `https://raw.githubusercontent.com/sindresorhus/word-list/${revision}/`;
const fetchText = async (name) => {
  const response = await fetch(new URL(name, base));
  if (!response.ok) throw new Error(`Word-list fetch failed: ${response.status}`);
  return response.text();
};
const words = await fetchText("words.txt");
const sha256 = createHash("sha256").update(words).digest("hex");
if (sha256 !== "2df02fa8ed82d465482ae40c4f9cb52a713baa1d3bfdce1acb2a5fe30420eea8")
  throw new Error("Pinned spelling lexicon checksum changed");
const data = {
  source: {
    name: "word-list",
    version: "4.1.0",
    url: "https://registry.npmjs.org/word-list/-/word-list-4.1.0.tgz",
    sha256,
    license: "MIT",
  },
  words,
};
await writeFile(
  new URL("../server/answers/data/spelling-words.json", import.meta.url),
  `${JSON.stringify(data)}\n`,
);
await writeFile(
  new URL("../public/licenses/word-list.txt", import.meta.url),
  await fetchText("license"),
);
console.log(`Pinned ${words.trim().split("\n").length} spelling words (${sha256}).`);
