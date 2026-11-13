# Answer validation

Datasets own entities, aliases, properties and source evidence. Question packs
select subsets of those datasets. The runtime loads only the published packs;
there is no separate seed-category fallback, network verifier or LLM judge.
See [datasets and questions](../../content/README.md) for the content model,
refresh commands, property filters and correction workflow.

```sh
npm run answers:build
npm run answers:check
```

Both commands compile checked-in snapshots offline. The schema-3 catalogue
stores each dataset's used entities once, with question packs referencing stable
IDs. `catalogue-format.ts` validates and materializes those references on the
server. The browser receives the current question, boundary hint and accepted
labels, while answer banks, evidence and identities stay private.

| Module                                | Responsibility                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `catalogue-types.ts`                  | Dataset, question, snapshot, correction and compiled-pack contracts            |
| `catalogue-format.ts`, `catalogue.ts` | Deduplicated storage, reference validation and catalogue loading               |
| `question-types.ts`                   | Runtime question with its dataset identity and selected answers                |
| `normalize.ts`                        | Category-aware inflections, accents, punctuation, suffixes and exact symbols   |
| `index.ts`, `spelling.ts`             | Exact lookup, shared names and constrained typo tolerance                      |
| `../questions.ts`                     | Materialize published questions and protect meaningful words across questions  |
| `../game.ts`                          | Dataset-aware question rotation, identity consumption and authoritative timing |

Providers with `ambiguousNames: "consume-all"` accept names shared by admitted
entities and consume all matching IDs together. Scientific symbol collisions
reject; symbol capitalization remains meaningful. Exact names, aliases and
symbols precede spelling tolerance. A typo must have a unique nearest identity;
meaningful dictionary words and known answers from other questions stay protected.
Four-letter names have stricter rules and shorter names remain exact. Job datasets
can explicitly enable singular forms of plural occupation names.

The QUDT import and constrained SI-prefix grammar retain regional spellings,
plurals and exact scientific symbols. Source provenance and licenses accompany
the catalogue; public attribution is available in `/licenses/data.html`.

Open-ended question banks remain finite. A missing answer can be plausible in
real life. Maintainers can propose an evidenced dataset correction; approved
properties enter the dataset before question filters run. Pending suggestions
have no gameplay effect. Incorrect or repeated answers keep the vegetable with
the same player and leave the deadline unchanged.
