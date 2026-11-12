import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const library = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(library, "..");
const apps = [
  "car-cost-comparison",
  "fishing-checklist",
  "reel-capacity",
  "kiwi-fire-planner",
  "mermaid",
  "quiz-gen",
  "coast-forecast",
  "yaml-schema-validator",
];
const targets = process.argv.slice(2);
if (!targets.length) throw new Error("Name the apps to update, or pass --all.");
const selected = targets.includes("--all") ? apps : targets;
if (selected.some((name) => !apps.includes(name))) throw new Error("Unknown app name.");
const temporary = mkdtempSync(join(tmpdir(), "random-tools-mono-"));
try {
  const [archive] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", temporary], {
      cwd: library,
      encoding: "utf8",
    }),
  );
  for (const name of selected) {
    const app = join(root, name);
    const vendor = join(app, "vendor");
    mkdirSync(vendor, { recursive: true });
    for (const file of readdirSync(vendor)) {
      if (file.startsWith("random-tools-mono-") && file.endsWith(".tgz"))
        rmSync(join(vendor, file));
    }
    copyFileSync(join(temporary, archive.filename), join(vendor, archive.filename));
    const path = join(app, "package.json");
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    manifest.dependencies = {
      ...manifest.dependencies,
      "@random-tools/mono": `file:vendor/${archive.filename}`,
    };
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    execFileSync("npm", ["install", "--no-audit", "--no-fund"], { cwd: app, stdio: "inherit" });
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
