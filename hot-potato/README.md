# Hot Potato

A multiplayer category game for 2–8 gardeners, inspired by Krillion's Puffer Party.
Original handheld-era pixel art, a sunny garden, and a vegetable that gets hotter
as it travels clockwise through the campfire. Responsive on phones and desktops.

## Play

Choose a name and a boy or girl gardener. Host a garden and share the five-letter
code or copied invite link. Friends join with the code; the host starts the round.
For solo play, choose **Practise with bots**, or add practice gardeners to a lobby.
Bots are labelled in the garden. Rooms are private by code, with no public listing.

When the vegetable reaches you, type an unused answer to the question prompt and
press **Pass it!** or Enter. Answers are checked on the server against versioned
packs and curated banks; capitalisation, accents, punctuation, and regional
aliases are accepted according to each question's rules.
Wrong or repeated answers keep the vegetable in your hands while your timer ticks.
The input refocuses and selects the rejected answer, with a clear error message.
You may prepare an answer between turns: it stays private until your turn starts.
A speech bubble beside the active character shows their live typing. The answer
bar stays clear for private preparation. Accepted answers linger above each gardener
for 12 seconds, until their next turn, or until the question changes. Your screen's
edges glow red on your turn, with the heat growing as time runs out while the
centre stays clear.
Answer banks are intentionally finite; the hint explains boundaries where needed.
During play, the question and answer dock fit the visual viewport, including keyboard
resize and panning. Tall screens center a bounded play area so the question, garden
and answer dock remain aligned. The sage-green page background stays consistent. Short screens use a compact row of players and hearts; question
hints and picked answers stay available through the info button. The editable input
stays focused after submission and permits private preparation during a delayed reply.
Mobile browsers may require an initial tap to open the software keyboard.

Phone-width boards (up to 600px) and compact rows use direct vegetable hand-offs,
with no campfire. The flying vegetable scales to the available board height,
including when a keyboard opens. Larger boards keep the campfire route. Both
animations share the same server-controlled travel duration and turn timing.

There is no rarity system, external AI service, account, or paid dependency.

Every recipient gets a fresh, independently randomised timer. It starts only when
that player receives the vegetable, after the travel animation. Waiting until the
last moment cannot reduce the next player's time. Wrong and repeated answers show an error
and keep the input focused, with no time penalty. Every question is eligible to open
a round; the deck uses cryptographic shuffles of datasets and their questions.

| Pace    | Random duration per turn |
| ------- | ------------------------ |
| Gentle  | 8–12 seconds             |
| Classic | 5–8 seconds              |
| Spicy   | 3–5 seconds              |

Heat progresses relative to the current turn duration: warm red hands at 30%,
burning hands at 60%, and full-body flames at 82%. At zero, the player is charred
and loses one of three hearts. After a two-second recovery they return to normal;
at zero hearts they remain charred on the ground and spectate. The last gardener
with hearts wins; the host can start a rematch with fresh hearts.

The content model separates **datasets** from **questions**. Sixteen shared datasets
own answer identities, names and properties; 122 questions select subsets of those
records. Fruit and vegetables share food records. Pets, farm animals and native
New Zealand birds share animal records with role and native-region properties.
Plants and geography also combine related collections. All questions use compiled,
versioned packs; there is no separate runtime hand-written fallback.

The offline pipeline uses QUDT, Wikidata, NASA, PubChem, country data, LVIS object
names, EPA vehicles, PokeAPI and O*NET occupations. It includes all 118 elements,
all 88 modern constellations and over 3,240 units. Source snapshots, property tags
and reviewed corrections produce reproducible answer packs. See
[the dataset and question pipeline](content/README.md) for definitions, refresh
commands, coverage checks and source limits.

Spelling tolerance runs entirely on the server after exact names, aliases and symbols.
It accepts only a unique nearest identity: one insertion, omission, substitution or
adjacent transposition (two edits for names of ten or more letters). Four-letter
names accept swaps or an extra repeated letter; shorter names stay exact. Real
English words and known answers from other questions are protected from guessing.
Scientific notation remains exact; elements correct canonical names only. Accepted
typos consume the same answer identity, without revealing alternatives. The pinned
MIT word-list lexicon protects words; it does not generate or define category answers.
Regenerate it with `npm run answers:fetch:spelling`; its checksum is verified.

The question pool includes everyday scenes (a bus, kitchen, classroom, beach,
campsite, office and birthday party), car makes and models, electric and 4WD/AWD
cars, sports cars, video-game genres and decades, Pokémon types and broad job
families. Regional cheese questions and other specialist variants are archived.
Context memberships are reviewed, finite lists; plausible unlisted answers can
still be missing. Hints explain the question's boundary.

The deck draws across datasets before taking another question from each. Unused
questions carry across rematches, and the full pool is visited before an exact
question repeats. It prefers another dataset on a change; vegetable choices are
visual markers and do not constrain selection. Questions change after six fresh
answers, exhaustion of a smaller set, or a roast. The vegetable changes with the
question: potato, carrot, beetroot, turnip, pumpkin, corn, aubergine or tomato.

## Development

Use Node 22.13+ or Node 24+ and run commands in this directory:

```sh
npm ci
npm run dev
```

Vite runs on `http://localhost:5187`, proxying Socket.IO to port 5188.
The browser talks to its own origin; asset and font files are bundled locally.

```sh
npm run lint
npm run format:check
npm test
npm run build
npm start
```

Production serves the compiled frontend and multiplayer backend together on
port 3000, configurable with `PORT`. `/healthz` is the probe endpoint.

The independent Docker image needs only this directory as build context:

```sh
docker build -t hot-potato:latest .
docker run --rm -p 3000:3000 hot-potato:latest
```

## Server and rooms

Run one server process. Rooms and reconnect tokens are in memory, so restarting
clears games. Multiple independent servers require a shared room store and
Socket.IO adapter. No database, application secrets or volume are required.
Expose HTTP and WebSockets on the same origin. Deployment configuration is
maintained elsewhere; this directory only provides the Docker image.

Players have 30 seconds to reconnect with their browser tab's session token.
Hearts and seats survive a reload or brief network loss. A disconnected host's
controls move to the next connected human. The timer keeps running during
connection loss. Disconnected seats expire after the grace period; all-human-empty
rooms are removed. Idle rooms expire after one hour. Players can join between
rounds. Leaving mid-round removes the seat and passes to the next living connected
gardener. The backend owns the clock, turns, validation, hearts, and winner;
clients never receive the answer bank or another player's reconnect token.
Socket message size, action frequency, room count and room size are bounded.
Typing updates are separately rate limited and accepted only from the active
player for the exact answering turn. Drafts are cleared on pass, burn, departure,
or disconnect; old-turn and out-of-turn typing cannot enter room snapshots.

## Artwork and interface

`art/STYLE.md` defines the palette, sprite sizes, proportions, layout and motion.
Three separate asset tasks produced characters, the garden, and game props using
Aseprite. PNG exports in `public/assets/` are the runtime assets. Editable layered
`.aseprite` sources and reproducible Lua/Python scripts are under `art/`; see the
character, garden, and props notes there. All sprites are original. No assets or
code were copied from Pokémon or Krillion. Font licenses ship via the bundled
Chakra Petch, Pixelify Sans and Nunito packages. Chakra Petch provides clearer
retro headings and controls; the short logo keeps Pixelify Sans. Music and sound effects are intentionally deferred.

This app uses a custom game interface rather than Mono, as requested. It has its
own fonts and palette, visible keyboard focus, 44px controls, a native rules dialog,
mobile input controls, labelled hearts, and reduced motion support. It therefore
does not participate in Mono's vendored snapshot rollout.

## Code map

- `content/`: adapters, category definitions, fixtures, review report and corrections.
- `server/questions.ts`: load compiled questions and their dataset identities.
- `server/game.ts`: authoritative game transitions and public snapshots.
- `server/rooms.ts`: membership, reconnects, host migration, and cleanup.
- `server/app.ts`: HTTP and Socket.IO transport, validation and rate limiting.
- `src/`: React lobby, garden, answer controls, question display and animation.
- `test/`: domain and live Socket.IO integration checks.

Browser checks are available with `npx playwright install chromium` followed by
`npm run test:browser`. They start an isolated server, exercise the full loop with
two browser contexts and bots, and save screenshots to `/tmp/hot-potato-qa`
(override with `SCREENSHOT_DIR`). They cover 320–1440px layouts and reduced motion.

Native tests exercise validation, question rotation/exhaustion, independent turn
timers, late passing, percentage heat stages, charring/recovery, elimination,
winners, rematches, live typing visibility, reconnection, host migration, room
bounds, cleanup, and private snapshot contents.

Character redesign concepts are in `art/concepts/character-options.png`, generated
with the built-in image-generation tool using the supplied style reference. The
exact prompt is saved alongside it. The approved A characters are extracted directly into 64×96 native sprites.
Production idle frame one preserves the exact approved pixels; receiving poses
use local arm edits, followed by upright charred and prone eliminated states.
Editable animation sources and reproduction notes are in `art/characters.md`.
