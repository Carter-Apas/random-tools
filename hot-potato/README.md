# Hot Potato

A multiplayer category game for 2–8 gardeners, inspired by Krillion's Puffer Party.
Original handheld-era pixel art, a sunny garden, and a vegetable that gets hotter
as it travels clockwise through the campfire. Responsive on phones and desktops.

## Play

Choose a name and a boy or girl gardener. Host a garden and share the five-letter
code or copied invite link. Friends join with the code; the host starts the round.
For solo play, choose **Practise with bots**, or add practice gardeners to a lobby.
Bots are labelled in the garden. Rooms are private by code, with no public listing.

When the vegetable reaches you, type an unused answer to the category prompt and
press **Pass it!** or Enter. Answers are checked on the server against a curated
bank; capitalisation, accents, punctuation, and listed regional aliases are accepted.
Wrong or repeated answers keep the vegetable in your hands while your timer ticks.
The input refocuses and selects the rejected answer, with a clear error message.
You may prepare an answer between turns: it stays private until your turn starts.
A speech bubble beside the active character shows their live typing. The answer
bar stays clear for private preparation.
Answer banks are intentionally finite; the hint explains boundaries where needed.
There is no rarity system, external AI service, account, or paid dependency.

Every recipient gets a fresh, independently randomised timer. It starts only when
that player receives the vegetable, after the travel animation. Waiting until the
last moment cannot reduce the next player's time. Wrong and repeated answers remove two seconds and advance the heat stages;
a penalty can immediately cost a heart if less than two seconds remain.

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

Unit answers use a server-only QUDT data pack plus valid SI prefix combinations,
including 3,243 canonical entries, plural forms, British/American spellings, and
case-sensitive scientific symbols. See [the modular answer pipeline](server/answers/README.md)
for provenance, import steps, current coverage and the proposed verifier for misses.
Other categories still use their curated banks.

There are 24 rotating categories including moons, rivers, music genres, pasta,
cheese, European capitals and mountain ranges. Short calendar and basic list
categories have been removed. Categories change after six fresh answers, exhaustion
of a smaller set, or a roast. The vegetable always changes with the category:
potato, carrot, beetroot, turnip, pumpkin, corn, aubergine, or tomato.

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

- `server/categories.ts`: curated questions, answers and aliases. Add categories here.
- `server/game.ts`: authoritative game transitions and public snapshots.
- `server/rooms.ts`: membership, reconnects, host migration, and cleanup.
- `server/app.ts`: HTTP and Socket.IO transport, validation and rate limiting.
- `src/`: React lobby, garden, answer controls, category display and animation.
- `test/`: domain and live Socket.IO integration checks.

Browser checks are available with `npx playwright install chromium` followed by
`npm run test:browser`. They start an isolated server, exercise the full loop with
two browser contexts and bots, and save screenshots to `/tmp/hot-potato-qa`
(override with `SCREENSHOT_DIR`). They cover 320–1440px layouts and reduced motion.

Native tests exercise validation, category rotation/exhaustion, independent turn
timers, late passing, percentage heat stages, charring/recovery, elimination,
winners, rematches, live typing visibility, reconnection, host migration, room
bounds, cleanup, and private snapshot contents.

Character redesign concepts are in `art/concepts/character-options.png`, generated
with the built-in image-generation tool using the supplied style reference. The
exact prompt is saved alongside it. The approved A characters are extracted directly into 64×96 native sprites.
Production idle frame one preserves the exact approved pixels; receiving poses
use local arm edits, followed by upright charred and prone eliminated states.
Editable animation sources and reproduction notes are in `art/characters.md`.
