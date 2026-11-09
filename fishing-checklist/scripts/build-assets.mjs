import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

await copyFile(
  fileURLToPath(import.meta.resolve("@random-tools/mono/styles.css")),
  new URL("../public/mono.css", import.meta.url),
);
await copyFile(
  fileURLToPath(import.meta.resolve("@random-tools/mono/browser")),
  new URL("../public/mono.js", import.meta.url),
);
