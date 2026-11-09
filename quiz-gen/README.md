# Roundtable

Kahoot-style realtime trivia with AI-generated quizzes. A host creates a lobby, enters a topic, chooses quiz length, and the server uses OpenAI to generate strict JSON multiple-choice questions. Players join from their phones with a room code and play timed rounds over WebSockets.

## Stack

- Node.js + npm
- Express + Socket.IO
- React + Vite
- Tailwind CSS
- OpenAI Responses API
- Vitest + Testing Library

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file and add your OpenAI key:

```bash
cp .env.example .env
```

3. Run the app in development:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Environment

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
PORT=3001
QUESTION_DURATION_MS=15000
RESULT_DURATION_MS=4000
NEXT_ROUND_DELAY_MS=2500
LEADERBOARD_DURATION_MS=5000
```

- `NEXT_ROUND_DELAY_MS` controls the short countdown before the next question starts.
- `LEADERBOARD_DURATION_MS` controls how long the final leaderboard stays on screen before the waiting state.

## Scripts

- `npm run dev` starts Vite and the Socket.IO server together
- `npm test` runs the full test suite
- `npm run build` builds the client and compiles the server
- `npm start` runs the compiled production server

## Notes

- Lobby state is in memory only.
- Restart reuses the generated quiz payload and resets scores.
- A full server restart clears active lobbies.

## Shared interface and quality checks

This app consumes a versioned Mono archive from `vendor/`. The manifest and
lockfile pin its version and integrity, so `npm ci` and the Docker build work
using only this folder. The shared C header follows the system light/dark setting
until you choose a theme. Its sun/dusk/moon icon cycles Light, Mirage, and Dark;
the choice is saved separately from app data. See the
[root development guide](../README.md#independent-installs-shared-components)
for updating the library snapshot and the rationale for per-app tooling.

Use Node 22.13+ (22.x) or Node 24+:

```sh
npm ci
npm run lint
npm run format:check
npm run build
npm run test --if-present
```

`npm run format` writes formatting and `npm run lint:fix` applies lint fixes.
ESLint uses `@cartercree/eslint-config` v4. Local configs cover this app's source,
server, tests, and config files while excluding generated and vendored assets.
Source explanations belong in documentation under the v4 comment convention.
