# Random tools

Independent tools for self-hosting on an internal Kubernetes cluster. Each app has
its own dependencies, lockfile, Dockerfile, and Docker build context. There is no
shared npm workspace or root install step.

| Folder | Image | Container port |
| --- | --- | --- |
| `car-cost-comparison` | `ghcr.io/carter-apas/car-cost-comparison:latest` | 80 |
| `fishing-checklist` | `ghcr.io/carter-apas/fishing-checklist:latest` | 80 |
| `kiwi-fire-planner` | `ghcr.io/carter-apas/kiwi-fire-planner:latest` | 80 |
| `quiz-gen` | `ghcr.io/carter-apas/quiz-gen:latest` | 3001 |

## Development

Run commands inside the app you want to work on:

```sh
cd car-cost-comparison
npm ci
npm run dev
```

See each app's README for its configuration and scripts.

## Containers

Build from the repository root using the app folder as the context:

```sh
docker build -t car-cost-comparison:latest car-cost-comparison
docker run --rm -p 8080:80 -v car-market:/app/.cache car-cost-comparison:latest

docker build -t kiwi-fire-planner:latest kiwi-fire-planner
docker run --rm -p 8081:80 kiwi-fire-planner:latest

docker build -t fishing-checklist:latest fishing-checklist
docker run --rm -p 8082:80 fishing-checklist:latest

docker build -t quiz-gen:latest quiz-gen
docker run --rm -p 3001:3001 --env-file quiz-gen/.env quiz-gen:latest
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
- **quiz-gen:** provide `OPENAI_API_KEY` through a Kubernetes Secret. Start with one
  replica: lobbies are stored in process memory. Route WebSocket traffic through
  your ingress to port 3001. A restart clears active games.

## Imported sources

These are source snapshots, without nested Git repositories or original release
workflows. The original repositories and local checkouts remain independent.

| App | Source | Commit |
| --- | --- | --- |
| car-cost-comparison | https://github.com/Carter-Apas/car-cost-comparison | `d989131d8d4ce592c39ac3c7e73f1c76d6cefc44` |
| kiwi-fire-planner | https://github.com/Carter-Apas/kiwi-fire-planner | `1d185ff4be170b55ffc3af2001b24fdf87bcf5b7` |
| quiz-gen | https://github.com/Carter-Apas/quiz-gen | `c27012462d611b606d246baf9f35481e80a38440` |

Quiz-gen's former workspace was flattened into its app folder, retaining its
locked dependencies and adapting its Dockerfile to the independent build context.
