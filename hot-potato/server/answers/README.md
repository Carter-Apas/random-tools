# Answer pipeline

The game accepts entities, not popularity. A rare answer should pass under the
same rules as a common answer. An answer bank remains on the server; the frontend
receives only the current prompt, verdict, and already accepted answers.

Krillion describes curating answer sets by aggregating dictionaries, datasets and
encyclopedic sources, then merging/cleaning aliases:
https://krillion.io/faq. This implementation uses that general approach with
explicit provenance and canonical IDs.

## Implemented modules

| Module                        | Responsibility                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                    | Provider and versioned answer-pack contracts; canonical identity, label, aliases, symbols and source                                                                               |
| `scripts/build-unit-pack.mjs` | Fetch a pinned source revision, parse RDF, remove deprecated entries, extract English labels/aliases/symbols, merge explicitly equivalent entities, record source hash and license |
| `data/units.json`             | Checked-in QUDT snapshot, loaded only by the server; normal builds need no network                                                                                                 |
| `normalize.ts`                | Accent/punctuation/case handling for names, category-aware plural forms and suffixes, separate case-sensitive symbol normalization                                                 |
| `prefixes.ts`                 | Constrained SI-prefix grammar over an explicit set of valid units, including quetta/ronna/ronto/quecto                                                                             |
| `units.ts`                    | Merge familiar aliases with the source pack and prefix grammar                                                                                                                     |
| `index.ts`                    | Indexed lookup behind `AnswerProvider`; refuse ambiguous cross-entity aliases and avoid arbitrary fuzzy guesses                                                                    |
| `server/game.ts`              | Deduplicate canonical IDs, keep answer labels for display, apply game timing and penalties independently of validation                                                             |

Rebuild the units snapshot with `npm run answers:build`. This is a deliberate
network operation against the pinned QUDT revision, not a runtime request or a
side effect of `npm run build`. A suspiciously small import is rejected. Review
source changes, alias collisions, membership boundaries and regression cases
before replacing a pack. The raw dataset is parsed as data, never executed.

The current import has 2,733 non-deprecated canonical QUDT entities. Additional
SI prefix combinations extend that set. Examples such as litres/liters and
metres/meters resolve to one identity, so changing spelling cannot bypass the
already-used rule. Name case is flexible; scientific symbol case is preserved.
There is no autocomplete, nearest-answer hint, candidate list or popularity filter.
No answer pack is copied into the browser bundle or public assets.

Sources and licenses:

- QUDT units and aliases, CC BY 4.0: https://github.com/qudt/qudt-public-repo
- QUDT data revision and SHA-256: `data/units.json` source metadata
- QUDT attribution/license distributed with the app: `public/licenses/qudt.txt`
- SI prefixes: https://www.bipm.org/en/measurement-units/si-prefixes
- English inflection rules: https://github.com/plurals/pluralize (MIT)

## Extending coverage

Each category gets a source adapter and a pack. The registry and game do not
change when an adapter is added. Suggested next sources are Wikidata's typed
entities/aliases for geographical and astronomical categories, botanical/taxonomic
sources for plants/animals, and domain-specific culinary datasets for food.
Wikidata's access methods and CC0 terms are documented at
https://www.wikidata.org/wiki/Wikidata:Data_access.

An adapter must specify category membership, disambiguation and accepted language
variants. For example, a geographical source needs a policy for historical names,
territories and transcontinental countries. A raw text search hit is not proof
that an answer belongs to a category. Every accepted record should retain its
entity ID and provenance. Providers must not filter by fame or usage frequency.

Other categories currently retain their curated seed banks. The units provider
is the first complete import/normalization/lookup path, not a claim that all
categories now have exhaustive coverage. No finite dataset can guarantee every
possible obscure answer.

## Proposed verification of misses

A future `AnswerVerifier` adapter can resolve an exact submitted name or alias
against a trusted source and check typed category membership. Its contract should
return `accepted(entity, evidence)`, `invalid(evidence)`, or `unverified(reason)`.
Only the submitted answer is checked: the response must never contain nearby
answers, spelling suggestions or an unused-answer list.

Use local packs first. For a miss, use one bounded verification request for that
turn, cache successful canonical identities with provenance, and reject late or
stale completions after the turn changes. Validation timing must use the server's
receipt timestamp, with a small total per-turn verification allowance; repeated
requests must not create unlimited thinking time. A verified wrong answer costs
two seconds. An unavailable source or ambiguous/unverified result should not
receive that additional penalty. It can still leave the natural turn timer
running. A negative lookup in an incomplete dataset is not proof of invalidity.

A post-round correction queue should retain the submitted text and category,
not other accepted answers. Confirmed omissions become regression fixtures and
pack updates. Missing-source verification and that correction queue are design
proposals, not enabled runtime services in this revision. Current unmatched
submissions follow the existing wrong-answer rule, so coverage expansion is
still necessary before promising exhaustive acceptance in every category.

An LLM may help suggest import candidates during content work, but should not
make an unsupported yes/no decision during a live turn. Neither network outages
nor model confidence should decide whether an obscure fact is true.
