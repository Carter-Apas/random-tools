# Hot Potato: notes for agents

## Writing questions

A question changes after six accepted answers, so a good question is one where
finding six takes some thought. Before adding one, ask: **could a typical player
list a dozen answers without pausing?** If yes, it is too broad. The size of the
answer bank is not the measure. What matters is how many answers people actually
know.

Not allowed: catch-all categories everyone can recite.

| Too broad                       | Use instead                                            |
| ------------------------------- | ------------------------------------------------------ |
| Name a chemical element         | a transition metal, a noble gas, a one-letter symbol   |
| Name a unit of measurement      | a unit of pressure, of energy, of angle                |
| Name an animal / a bird         | a marsupial, a wild cat, a flightless bird, an NZ bird |
| Name a common fruit / vegetable | a citrus fruit, a berry, a root vegetable              |
| Name a colour                   | a shade of blue                                        |
| Name a language                 | a Romance language, a Pacific Island language          |
| Name a country                  | a Caribbean country, a country that uses the euro      |
| Name a sport / a team sport     | a combat sport, a track and field event                |
| Name a car company / car model  | an electric car, a two-seater                          |
| Name a job, a Pokémon, a game   | a job in law, a ghost-type Pokémon, a Nintendo 64 game |
| Name something you can wear     | something you would find in a toolbox                  |

Good: specific and a bit niche, even when the answer bank is large.

- Name a moon in our solar system; name a type of pasta; name a constellation.
- Name a country in Europe; name a US state; name a common type of tree; name a
  common garden flower; name one of the original 151 Pokémon.

Also avoid the other extreme. A question with only six or seven answers forces
players to name nearly all of them (halogens, alkali metals and metalloids are
archived for this reason). Aim for roughly ten or more.

## Implicit category words

Players should never have to type the category itself. When answers contain the
word the question is about ("Sky blue" in a shades of blue question, "Tiger
shark" in a shark question), list that word under the question's
`normalization.suffixes` or `normalization.prefixes` in `content/questions.json`
so "sky" and "tiger" are accepted. Check this for every new question.

- Only list the category word or its direct forms ("rock", "rock music"). Do not
  list other head nouns: "spaniel" in a gundog question would make "English"
  match three breeds.
- A leading "The" is already optional everywhere; do not add it.
- After adding a rule, try the bare category word and a few short forms. The
  bare word must stay rejected, and no short form should read as a wrong answer.

The matching rules themselves are described in `content/README.md`.

## What the build enforces

`npm run answers:build` and `npm run answers:check` fail when a question in
`content/questions.json`:

- uses an ID listed under `tooBroad` in `content/question-policy.json`;
- selects the same dataset and filter as one of those questions under a new ID;
- has an empty filter (`"where": {}`), unless its ID is in `wholeDatasetAllowed`.

This only stops known-broad questions coming back. It cannot judge a new prompt,
so apply the test above yourself. When a question is ruled too broad, move it and
its fixtures to `content/retired-questions.json` and
`content/retired-fixtures.json`, add its ID to `tooBroad`, and rebuild with
`npm run answers:build -- --allow-removals`.

Do not add to `wholeDatasetAllowed` or remove from `tooBroad` without the owner
asking for it.
