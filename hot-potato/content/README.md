# Category content pipeline

Source adapters collect whole catalogues; category definitions select records;
reviewed corrections add missing facts or names; checks gate publication. Live
games read the compiled, versioned server catalogue without external requests.

## Build and refresh

Run from `hot-potato/`:

```sh
npm run answers:build
npm run answers:check
```

Both use checked-in snapshots and require no network. Build publishes
`server/answers/data/catalogue.json` only after checks pass. Check also requires
the rebuilt content version to match the published catalogue. Normal app and
Docker builds consume the published file without running content tools.
The builder reads legacy seeds independently of the published output. Use
`npm run answers:build -- --bootstrap` to create the output from scratch or
replace a damaged file; this skips comparison with the previous version while
retaining source, size and benchmark checks.

Fetch fresh data explicitly, then rebuild and review the changes:

```sh
npm run answers:fetch
npm run answers:fetch -- pasta cheeses
npm run answers:fetch:units
```

Wikidata imports use typed membership queries, English and language-neutral
names, and all matching records. There is no popularity, pageview, sitelink or
top-result cutoff. English labels take precedence over neutral labels. NASA's
adapter parses the StarChild constellation table and requires exactly 88 unique
records. QUDT reuses the pinned units import and constrained SI-prefix grammar.

Imports respect HTTP retry intervals and stop on invalid or unexpectedly small
responses. Normalized snapshots under `sources/` are gzip compressed and pinned
by SHA-256 in `sources.lock.json`. Each records the original response hash,
retrieval revision, query URL and license. Wikidata is a captured live query,
rather than a historical database-wide revision. Offline rebuilds reproduce the
captured data; refreshing it is a separate content change.

## Add a category

Add a definition to `definitions.json`: ID, prompt, membership hint, vegetable,
source selector, normalization rules and expected size. `select.where` combines
fact filters with AND between properties and OR between values. A second country
category can reuse `wikidata-countries` with `"where": { "continents": ["Q48"] }`
for Asia. It needs no new importer or gameplay code. Explain how transcontinental
countries, territories and former countries are treated in its hint.

Add an adapter only when existing snapshots lack the catalogue or membership
facts you need. Add independent common, obscure and invalid boundary cases to
`fixtures.json`, then build and inspect `review.json`. The elements and modern
constellations definitions require exactly 118 and 88 records respectively.

## Correct an omission

```sh
npm run answers:propose -- \
  --category pasta \
  --answer 'A documented regional variety' \
  --evidence 'https://example.org/source' \
  --reason 'The source identifies this as a pasta shape'
```

This appends a pending suggestion to ignored `candidates.local.jsonl`. It has no
effect on gameplay. Verify its evidence and membership, copy it into
`corrections.json`, and set status to `approved`. Use `--id` with an existing
source ID when adding an alias; new entities receive a stable review ID.

Corrections support `upsert` (default), `exclude` and `remove-aliases`. Approved
entries require an HTTPS evidence URL and a review reason. Their URLs and text
are never executed. Add a regression fixture for each fix. The Filindeu entry
demonstrates a documented regional alias missing from the source import.

AI or other tools can propose candidates in this same format. No model is
connected to the live timer or trusted to approve its own suggestions. This is
a maintainer queue; an in-game player reporting interface is not implemented.

## Identity, review and publication

The compiler retains source IDs, aliases and evidence. Legacy names attach to
source records through unambiguous matches. Curated names take priority over
conflicting source aliases; unmatched legacy records are reported separately.
Different external IDs are never merged solely because names match. Records
whose names are entirely reserved by another curated identity are quarantined
in the report for disambiguation.

Published packs accept a shared valid name even when several admitted entities
use it. Lookup consumes all matching identities, preventing reuse through a
specific alias. Candidates remain private. Scientific symbol collisions still
fail closed, and symbol capitalization remains meaningful. Other providers can
retain the default ambiguous-name rejection policy.

Publication requires the benchmark and existing-answer baseline to pass. Losing
over 10% of a category's previous IDs blocks publication even if additions hide
the loss in its total count. After review, use
`npm run answers:build -- --allow-removals` to permit a deliberate large change.
Failures leave the previous published file intact; successful writes use an
atomic rename. `review.json` lists versions, additions/removals, legacy-only
answers, ambiguous names, quarantined records and individual check results.

The ten packs cover units, chemical elements, planetary moons, pasta, cheeses,
music genres, musical instruments, seas, African countries and constellations.
Membership boundaries matter: seas include historical seas but exclude lakes
and oceans; moons exclude provisional numbered designations; African countries
are current UN members; pasta excludes prepared dishes. Remaining game
categories retain their legacy banks.

The benchmark contains 100 independently chosen expectations: 30 common and 30
obscure positives, and 40 invalid boundaries. A separate baseline protects
previously accepted answers. Passing these cases does not establish 99%
real-world coverage. Sources can omit or misclassify facts; legacy-only entries
and quarantined identities are explicit remaining content work. Broader sources
and further independent test cases improve coverage without popularity filters.

Runtime misses still follow the existing wrong-answer rule. A bounded live
verifier and its timing policy remain separate future work; the content pipeline
does not turn an unverified miss into an externally disproven fact.
