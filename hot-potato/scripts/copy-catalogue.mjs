import { copyFile, mkdir } from "node:fs/promises";
const output = new URL("../dist/server/server/answers/data/", import.meta.url);
await mkdir(output, { recursive: true });
await copyFile(
  new URL("../server/answers/data/catalogue.json", import.meta.url),
  new URL("catalogue.json", output),
);
