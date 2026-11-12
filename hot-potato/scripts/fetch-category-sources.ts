import { fetchWikidata, wikidataCollections } from "../content/adapters/wikidata.js";
import { saveSnapshot } from "../content/io.js";
import { fetchConstellations } from "../content/adapters/nasa.js";

const requested = process.argv.slice(2);
const collections = requested.length
  ? wikidataCollections.filter((item) => requested.includes(item.id))
  : wikidataCollections;
for (const id of requested) {
  if (id !== "constellations" && !collections.some((item) => item.id === id))
    throw new Error(`Unknown collection: ${id}`);
}
if (!requested.length || requested.includes("constellations")) {
  const snapshot = await fetchConstellations();
  await saveSnapshot(snapshot);
  console.log(`Saved ${snapshot.source.id}: ${snapshot.records.length} records`);
}
for (const collection of collections) {
  console.log(`Fetching ${collection.id}...`);
  const snapshot = await fetchWikidata(collection);
  await saveSnapshot(snapshot);
  console.log(
    `Saved ${snapshot.source.id}: ${snapshot.records.length} records; ${snapshot.source.sha256}`,
  );
}
