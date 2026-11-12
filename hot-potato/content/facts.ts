import type { FactCorrection, SourceSnapshot } from "../server/answers/catalogue-types.js";

export const correctFacts = (
  snapshot: SourceSnapshot,
  corrections: FactCorrection[],
): SourceSnapshot => {
  const relevant = corrections.filter((item) => item.sourceId === snapshot.source.id);
  if (!relevant.length) return snapshot;
  const records = snapshot.records.map((record) => ({ ...record, facts: { ...record.facts } }));
  for (const correction of relevant) {
    if (!/^https:\/\//.test(correction.evidence) || !correction.reason.trim())
      throw new Error("Fact corrections require evidence and a reason");
    const record = records.find((item) => item.id === correction.answerId);
    if (!record) throw new Error(`Missing fact-correction identity ${correction.answerId}`);
    for (const [key, values] of Object.entries(correction.facts))
      record.facts[key] = [...new Set(values)];
    record.evidence = [
      ...(record.evidence ?? []),
      { sourceId: "reviewed-facts", url: correction.evidence },
    ];
  }
  return { ...snapshot, records };
};
