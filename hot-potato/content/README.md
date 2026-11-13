# Datasets and questions

A **dataset** owns named records, stable identities, aliases and properties. A
**question** supplies a prompt, a boundary hint and a filter over one dataset.
For example, `elements` contains all 118 elements and their properties;
`elements-noble` selects `group: ["noble gas"]` from those same records.
Questions never append their own answers after filtering.

The game currently publishes **122 questions from 16 datasets**. Food combines
fruit, vegetables, herbs, spices, pulses, pasta and cheese. Animals combines pets,
farm animals and native birds: a horse can have both pet and farm roles, while a
kiwi has `kind: ["bird"]` and `nativeTo: ["NZ"]`. Plants combines trees and flowers.
Geography combines countries, capitals, rivers, seas and mountain ranges with a
`kind` discriminator. Structured collections such as elements and measurement
units keep their own schemas.

New collections cover everyday things, cars, video games, Pokémon and jobs.
Their questions include bus, kitchen, classroom, beach and camping items; car
makers, 4WD/AWD models, electric cars and sports cars; game genres and decades;
Pokémon types; and broad job families. Regional cheese questions, element-period
quizzes and other specialist variants are archived in `retired-questions.json`
with their cases in `retired-fixtures.json`. They are outside the active pool.

## Content files

- `datasets.json`: dataset names, descriptions, imports, normalization defaults
  and expected record counts.
- `curated-records.json`: shared project records with properties, including the
  migrated hand-written banks. Records contain no question prompts.
- `record-tags.json`: explicit identity-based context tags, classifications and
  regional aliases. Unknown identities fail the build.
- `questions.json`: playable prompts, hints, dataset IDs, property filters,
  optional normalization overrides and expected subset sizes.
- `sources/` and `sources.lock.json`: compressed source snapshots and checksums.
- `corrections.json`: evidenced dataset-level aliases, additions and exclusions.
- `fact-corrections.json`: evidenced corrections to imported classifications.
- `fixtures.json`: common, less obvious and rejected boundary cases per question.
- `legacy-answers.json`: migration aliases and regression baselines. This is a
  build input; there is no runtime fallback to a separate hand-written bank.
- `review.json`: publication results and changes from the previous catalogue.

## Add a question

Reuse an existing dataset and select records by their properties:

```json
{
  "id": "animals-nz-birds",
  "datasetId": "animals",
  "name": "Feathered neighbours",
  "prompt": "Name a native New Zealand bird",
  "hint": "Māori and English names count. Extinct native birds count too.",
  "vegetable": "carrot",
  "select": { "where": { "kind": ["bird"], "nativeTo": ["NZ"] } },
  "minimumAnswers": 20,
  "maximumAnswers": 500
}
```

Properties combine with AND; values within one property combine with OR. An
empty filter selects the whole dataset. Unknown properties, empty filters for a
property and unexpectedly small or large subsets fail publication. Each question
needs independently chosen common, less obvious and invalid boundary fixtures.
The dataset supplies normalization defaults; a question can override these for
boundaries such as optional "River" or "Cheese" suffixes.

Questions cannot carry ad hoc lists of additional accepted answers. Correct the
shared record or its properties and rebuild all affected questions instead.

## Add or extend a dataset

Add its definition to `datasets.json`. An import references a checked-in source
snapshot and can attach common facts such as `kind: ["cheese"]`. An import with
`mode: "enrich"` adds properties to existing IDs without reintroducing removed
records or replacing current names. Imports join by
stable ID and retain aliases, properties and source evidence. Equal labels alone
never merge unrelated external identities. Curated records and explicit tags
extend those same datasets. Pending suggestions do not enter gameplay.

Add an importer only when an existing snapshot lacks the required collection or
properties. Adapters collect complete matching source sets without popularity or
pageview cutoffs. Source record counts and SHA-256 checksums guard refreshes.
No gameplay code needs to change to add a dataset or a question.

## Build and refresh

Run from `hot-potato/`:

```sh
npm run answers:build
npm run answers:check
```

Both commands work offline. They assemble shared datasets, apply corrections,
compile each question's subset and run coverage and existing-answer checks.
Successful publication atomically replaces `server/answers/data/catalogue.json`.
The schema-3 catalogue stores each dataset's used answer identities once; question
packs reference those identities. The server loads it without network access.
The browser receives the current prompt, hint and accepted display labels only.

The normal app and Docker builds consume this published file. Content refreshes
are separate, explicit operations:

```sh
npm run datasets:fetch -- objects vehicles video-games pokemon occupations
npm run answers:fetch -- pasta cheeses
npm run questions:fetch -- instrument-families genre-families
npm run answers:fetch:units
npm run answers:build
npm run answers:check
```

The new dataset importer uses Python 3's standard library. It is unnecessary for
normal app builds and deployment. It streams the large game response and only
parses downloaded LVIS Python literals with `ast.literal_eval`; it never executes
downloaded code. `--from-cache DIRECTORY` can normalize captured raw responses
without another network request.

Existing source adapters cover QUDT, Wikidata, NASA, PubChem and mledoze/countries.
Refresh answer sources and build base packs before refreshing their derived
classification snapshots. Wikidata snapshots capture a query at retrieval time;
these are pinned facts, not a guarantee that classifications never change.

New sources and their limits:

| Dataset         | Source                                                                     | Properties and limits                                                                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Everyday things | [LVIS v1](https://www.lvisdataset.org/) vocabulary                         | Object names and synonyms; scene/context membership is explicit project curation, not an inferred LVIS fact.                                                                                                                                                                 |
| Cars            | [US EPA](https://www.fueleconomy.gov/feg/ws/index.shtml) and Wikidata      | Global makes/model classes from Wikidata, plus US-market drivetrain, fuel and body classes since 1984 from EPA; sports-car classes use Wikidata plus evidenced tags. AWD counts in the combined 4WD/AWD question. Two-seater and sports-car classifications remain distinct. |
| Video games     | [Wikidata](https://www.wikidata.org/wiki/Wikidata:WikiProject_Video_games) | English and language-neutral titles, aliases, genres, platform IDs and release decades; genre filters include captured subclass ancestry. Entries require a direct video-game type.                                                                                          |
| Pokémon         | [PokeAPI](https://github.com/PokeAPI/pokeapi)                              | English species names, generations, default-form types, legendary/mythical status; alternate forms share a species identity.                                                                                                                                                 |
| Jobs            | [O*NET 31.0](https://www.onetcenter.org/database.html)                     | Occupation codes, alternate job titles and SOC job families; plural occupational titles also accept singulars. No descriptions are imported.                                                                                                                                 |

Open-ended scene questions have finite, reviewed memberships. An unlisted item
can still be plausible in real life. The hint states the intended boundary; the
pipeline does not claim exhaustive real-world coverage. New context tags and
aliases belong in the dataset, where future prompts can reuse them.

## Correct an omission

```sh
npm run answers:propose -- \
  --dataset food \
  --answer 'A documented regional pasta' \
  --facts '{"kind":["pasta"]}' \
  --evidence 'https://example.org/source' \
  --reason 'The source identifies it as a pasta shape'
```

This writes a pending suggestion to ignored `candidates.local.jsonl`. Verify its
identity, membership facts and evidence before adding an approved entry to
`corrections.json`. Use `--id` to attach an alias to an existing entity. Corrections
apply to the dataset before question filters run, so they cannot bypass a narrower
question's membership rules. Add a fixture for each fix.

Approved corrections require an HTTPS evidence URL and a review reason. The
supported actions are `upsert`, `exclude` and `remove-aliases`. Properties on an
upsert describe where the record belongs. Evidence text and URLs are never run.
Tags in `record-tags.json` are editorial; scientific or source-classification
corrections belong in the evidenced correction files.

Publication also blocks removal of over 10% of any previous question's IDs, even
if additions hide the loss. `--allow-removals` permits a deliberate reviewed change.
`--bootstrap` recovers a missing or older-schema catalogue while retaining source,
size and coverage checks. Failures preserve the previously published catalogue.

## Gameplay

A question is the unit of play. The deck draws across datasets before taking
another question from each, shuffling datasets and questions cryptographically.
Unused questions survive rematches; exact questions repeat only after the pool
has been visited. On a change the game prefers a different dataset. Vegetables
are visual markers and never determine which dataset is eligible.

Questions change after six accepted answers, exhaustion of a smaller bank, or a
roast. Shared aliases resolve to the same identity; names shared by admitted
entities consume every matching identity. Scientific symbol collisions reject.
Spelling tolerance accepts only a unique nearest identity, protects dictionary
words and meaningful answers from other questions, and never reveals candidates.
Incorrect or repeated submissions leave the turn deadline unchanged.

There is no live verifier, in-game reporting UI or LLM judge. Those would require
a separate timing policy and stale-turn protection. Source snapshots, metadata,
licenses and attribution remain server-side or on the public data-credits page.
