# Answer validation

Answer catalogues, aliases, provenance, source versions and identity groups stay
on the server. Clients receive the prompt, verdict and accepted display labels.
Popularity is not an admission criterion.

See [the content pipeline](../../content/README.md) for adapters, snapshot updates,
category definitions, coverage checks and reviewed corrections.

```sh
npm run answers:build
npm run answers:check
```

Both commands are offline. They compile ten category packs from checked-in
sources and publish `data/catalogue.json` only after validation. Refresh data
separately with `npm run answers:fetch`; refresh the pinned QUDT import with
`npm run answers:fetch:units`.

## Runtime modules

| Module                           | Responsibility                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `types.ts`, `catalogue-types.ts` | Entity, provider, source, definition and catalogue contracts                             |
| `catalogue.ts`                   | Validate and load the published catalogue without network access                         |
| `normalize.ts`                   | Category-specific plurals/suffixes, accents and punctuation; separate scientific symbols |
| `index.ts`                       | Indexed lookup and explicit handling for names shared by admitted entities               |
| `units.ts`, `prefixes.ts`        | Preserve familiar unit names and constrain SI-prefix combinations during content builds  |
| `server/categories.ts`           | Combine packs with remaining curated categories                                          |
| `server/game.ts`                 | Consume identities, prevent repeated aliases and own timing                              |

Shared names are accepted only when a provider explicitly enables
`ambiguousNames: "consume-all"`. The result contains all matching IDs and the
game consumes them together. Reusing one through a specific alias is rejected.
Candidates and identity lists are not returned to the browser. Symbol collisions
still fail closed and symbol case remains meaningful. Other providers default
to ambiguous-name rejection. Fuzzy guesses and autocomplete are not enabled.

QUDT contains 2,733 non-deprecated source entities, extended by valid SI prefixes
to 3,243 units. Litres/liters, metres/meters and their plurals share identities.
The original pinned revision and response hash remain in `data/units.json`;
attribution and license ship in `public/licenses/qudt.txt`.

Other imports use Wikidata typed entities/names (CC0) and NASA StarChild's
constellation table (US government facts). Source URLs, hashes and captured
revisions accompany the server catalogue. Additional source notes ship in
`public/licenses/answer-sources.txt`.

## Misses and future verification

The pipeline provides a maintainer suggestion queue and reviewed corrections.
There is no live verifier, in-game reporting UI or LLM judge. An unmatched
submission still follows the two-second penalty rule. A source miss does not
prove real-world invalidity; open-ended categories have no exhaustive guarantee.

A future `AnswerVerifier` should return `accepted(entity, evidence)`,
`invalid(evidence)` or `unverified(reason)` for the submitted answer alone.
It must not return related answers or suggestions. Requests need a bounded
per-turn allowance, server receipt timestamps, caching and stale-turn rejection.
Network failure or ambiguity must not trigger an extra wrong-answer penalty.
That timing policy remains separate from content imports.
