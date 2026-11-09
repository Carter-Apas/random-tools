# Random tools

Independent tools for self-hosting on an internal Kubernetes cluster. Each app has
its own dependencies, lockfile, Dockerfile, and Docker build context. There is no
shared npm workspace or root install step.

| Folder                | Image                                            | Container port |
| --------------------- | ------------------------------------------------ | -------------- |
| `car-cost-comparison` | `ghcr.io/carter-apas/car-cost-comparison:latest` | 80             |
| `fishing-checklist`   | `ghcr.io/carter-apas/fishing-checklist:latest`   | 80             |
| `reel-capacity`       | `ghcr.io/carter-apas/reel-capacity:latest`       | 80             |
| `kiwi-fire-planner`   | `ghcr.io/carter-apas/kiwi-fire-planner:latest`   | 80             |
| `mermaid`             | `ghcr.io/carter-apas/mermaid:latest`             | 80             |
| `quiz-gen`            | `ghcr.io/carter-apas/quiz-gen:latest`            | 3001           |
| `coast-forecast`      | `ghcr.io/carter-apas/coast-forecast:latest`      | 80             |

## Development

Run commands inside the app you want to work on:

```sh
cd car-cost-comparison
npm ci
npm run dev
```

See each app's README for its configuration and scripts.

## Shared design system

[`design-system/`](design-system/README.md) contains **Mono**, a standalone
Storybook for the shared interface language. It includes Ayu-inspired Dark,
Mirage, and Light appearances, reusable React components, framework-independent
CSS tokens, and interactive examples from these tools. All seven apps consume
versioned local snapshots of this library.

```sh
cd design-system
npm ci
npm run dev
```

Open [Storybook](http://localhost:6006/?path=/story/start-here-overview--design-language)
to review the design.

## Independent installs, shared components

Each app keeps its own package manifest, lockfile, ESLint config, Prettier config,
and Docker context. There is no root npm install and no npm workspace. Run these
commands from any app folder, or from `design-system/`:

```sh
npm ci
npm run lint
npm run format:check
npm run build
npm run test --if-present
```

Use Node 22.13+ (22.x) or Node 24+. `npm run format` writes formatting changes;
`npm run lint:fix` applies supported lint fixes. All projects use
`@cartercree/eslint-config` v4, ESLint 10, and the same small Prettier settings.
The shared ESLint package centralizes rules; local config files keep app-specific
file scopes and exceptions independent. V4 disallows JavaScript/TypeScript comments;
put explanations in READMEs and design/architecture docs. Empty catch blocks remain
errors: recover with an explicit fallback, report a failed operation, or propagate
the error to its caller. Existing calculation,
request-routing, and game-screen entrypoints have explicit per-file complexity
limits; shared UI and other files retain the preset's default limit of 10.

Mono is shared as a built, versioned npm archive under each app's `vendor/`
directory, referenced by its local package manifest and integrity-pinned lockfile.
These archives are intentional source dependencies. Generated assets, node_modules,
and build outputs stay ignored. This avoids sibling `file:../design-system`
dependencies, which cannot be installed inside isolated Docker build contexts.
The archive's browser module supports the plain JavaScript tools without adding
React; React apps import the actual shared controls and application header.

A library edit validates only the library until an app explicitly adopts a new
snapshot. To release a change to selected tools:

```sh
cd design-system
npm version patch --no-git-tag-version
npm run package:apps -- car-cost-comparison fishing-checklist
```

Use `--all` for an intentional full rollout. The packaging command builds the
library and updates selected archives, manifests, and lockfiles. Review and
validate those app folders, then commit the library and consumer updates together.
Each app can upgrade or roll back its snapshot independently.

`.github/workflows/checks.yml` runs lint, formatting, builds, and existing tests
only for changed project folders on PRs and main pushes. Each matrix job installs
only its project's dependencies and uses that project's lockfile as its cache key.
A library-only change does not trigger app image builds; snapshot updates change
consumer folders and naturally select those apps in the existing Docker workflow.
The publishing workflow and its folder-based image selection remain unchanged.

The broader browser rollout checks are available from `design-system/` with
`npm run test:apps` after the apps are installed and the quiz and Mermaid builds
exist. They exercise appearance persistence, accessibility, mobile layouts,
checklist storage, reel calculations, planner expenses, vehicle controls,
quiz form navigation, and live Mermaid rendering/saving. These checks are opt-in
so normal app CI jobs stay independent.

## Containers

Build from the repository root using the app folder as the context:

```sh
docker build -t car-cost-comparison:latest car-cost-comparison
docker run --rm -p 8080:80 -v car-market:/app/.cache car-cost-comparison:latest

docker build -t kiwi-fire-planner:latest kiwi-fire-planner
docker run --rm -p 8081:80 kiwi-fire-planner:latest

docker build -t fishing-checklist:latest fishing-checklist
docker run --rm -p 8082:80 fishing-checklist:latest

docker build -t reel-capacity:latest reel-capacity
docker run --rm -p 8084:80 reel-capacity:latest

docker build -t mermaid:latest mermaid
docker run --rm -p 8085:80 mermaid:latest

docker build -t quiz-gen:latest quiz-gen
docker run --rm -p 3001:3001 --env-file quiz-gen/.env quiz-gen:latest

docker build -t coast-forecast:latest coast-forecast
docker run --rm -p 8086:80 coast-forecast:latest
```

For quiz-gen, copy `quiz-gen/.env.example` to `quiz-gen/.env` and set
`OPENAI_API_KEY` before running. Environment files are excluded from image builds.

## Publishing

`.github/workflows/docker.yml` runs only on pushes to `main`, including merged
pull requests. It discovers `*/Dockerfile`, builds changed apps for `linux/amd64`,
and publishes `ghcr.io/<lowercase-repository-owner>/<folder-name>:latest`. No PR
builds or release/tag workflows run. Build layers are cached separately per app.
Only app folders changed between the push's previous and new commits are built.
A push changing only root documentation skips all image builds. Changes to the
publishing workflow rebuild all apps. The first push also builds all apps; if the
previous commit is unavailable (for example, after a force push), all apps rebuild
to avoid missing changes. File moves rebuild both affected app folders, provided
they still contain Dockerfiles.

The workflow authenticates with the built-in `GITHUB_TOKEN` and `packages: write`;
there are no registry secrets to configure. If reusing an existing GHCR package
from an original repository, grant this repository Actions write access in that
package's settings before the first publish. New packages may be private; make
them public or configure an image pull secret in Kubernetes.

Add a new tool in `<lowercase-image-name>/` with a `Dockerfile` and
`.dockerignore`. Its Dockerfile must build using only that folder as its context.
The next main push automatically publishes it without editing the workflow.

## Kubernetes

Use the image and container port from the table above in your existing homelab
manifests. Set `imagePullPolicy: Always` with the mutable `latest` tag. Publishing
an image does not restart running pods; trigger a rollout after publishing:

```sh
kubectl -n <namespace> rollout restart deployment/<tool-name>
```

- **car-cost-comparison:** mount a persistent volume at `/app/.cache` to keep the
  market-data cache across restarts. The backend requires outbound access to its
  market-data sources.
- **kiwi-fire-planner:** static frontend; planner data stays in browser local storage.
- **fishing-checklist:** static frontend; checklist progress stays in browser local
  storage. No volumes or secrets required. `/healthz` is available for probes.
- **reel-capacity:** static frontend; calculator inputs stay in browser local
  storage. No volumes or secrets required. `/healthz` is available for probes.
- **mermaid:** shared editor; run one replica. Tabs live in the container's writable
  layer and reset when it is replaced. Route `mermaid.coder.kiwi` to port 80 and
  allow unbuffered Server-Sent Events on `/api/events`. No volumes or secrets
  required. `/healthz` is available for probes.
- **quiz-gen:** provide `OPENAI_API_KEY` through a Kubernetes Secret. Start with one
  replica: lobbies are stored in process memory. Route WebSocket traffic through
  your ingress to port 3001. A restart clears active games.
- **coast-forecast:** route to port 80; allow outbound HTTPS to Open-Meteo's weather
  and marine APIs. Hourly forecasts are cached in server memory for one hour.
  No API key required for personal use. `/admin` is a password-protected curve editor and simulator for surfing / rock /
  inshore fishing. Use the app’s `compose.yaml` for a host bind mount, or mount
  `/app/.data` to retain JSON configuration and the password hash across container replacement. Optional startup defaults use
  `SPOT_CONFIG_FILE`. `/healthz` is available for probes.

## Imported sources

These are source snapshots, without nested Git repositories or original release
workflows. The original repositories and local checkouts remain independent.

| App                 | Source                                             | Commit                                     |
| ------------------- | -------------------------------------------------- | ------------------------------------------ |
| car-cost-comparison | https://github.com/Carter-Apas/car-cost-comparison | `d989131d8d4ce592c39ac3c7e73f1c76d6cefc44` |
| kiwi-fire-planner   | https://github.com/Carter-Apas/kiwi-fire-planner   | `1d185ff4be170b55ffc3af2001b24fdf87bcf5b7` |
| quiz-gen            | https://github.com/Carter-Apas/quiz-gen            | `c27012462d611b606d246baf9f35481e80a38440` |

Quiz-gen's former workspace was flattened into its app folder, retaining its
locked dependencies and adapting its Dockerfile to the independent build context.
