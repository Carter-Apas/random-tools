import { load } from "cheerio";

import { createHash } from "node:crypto";

import { fetchSourceText } from "../http.js";
import { normalize } from "../../server/answers/normalize.js";
import type { CatalogueRecord, SourceSnapshot } from "../../server/answers/catalogue-types.js";

const sourceUrl = "https://starchild.gsfc.nasa.gov/docs/StarChild/questions/88constellations.html";

export const parseConstellations = (html: string): CatalogueRecord[] => {
  const $ = load(html);
  const table = $("table")
    .filter((_, element) => $(element).find("th").text().includes("Latin Name"))
    .first();
  const records: CatalogueRecord[] = [];
  table.find("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length !== 2) return;
    const label = cells.eq(0).text().trim();
    const english = cells.eq(1).text().trim();
    if (!/^[A-Za-z ]+$/.test(label)) throw new Error("Unexpected NASA constellation name");
    records.push({
      id: `nasa:constellation:${normalize(label)}`,
      label,
      aliases: [english],
      source: sourceUrl,
      facts: {},
    });
  });
  if (records.length !== 88 || new Set(records.map((record) => record.id)).size !== 88)
    throw new Error(`NASA table changed: expected 88 unique constellations, got ${records.length}`);
  return records.sort((a, b) => a.id.localeCompare(b.id));
};

export const fetchConstellations = async (
  fetcher: typeof fetch = fetch,
): Promise<SourceSnapshot> => {
  const html = await fetchSourceText(sourceUrl, fetcher);
  return {
    schemaVersion: 1,
    source: {
      id: "nasa-constellations",
      name: "NASA StarChild recognised constellations",
      url: sourceUrl,
      license: "US-GOV-NASA",
      revision: new Date().toISOString(),
      sha256: createHash("sha256").update(html).digest("hex"),
    },
    records: parseConstellations(html),
  };
};
