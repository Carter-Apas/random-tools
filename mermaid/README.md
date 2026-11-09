# Mermaid

A shared Mermaid diagram workspace for `mermaid.coder.kiwi`. Everyone opens the
same workspace at `/`; a fresh visit always selects the first tab. Create up to
10 tabs, rename or delete them, and write Mermaid source alongside a live preview.
Changes to source, names, and tabs are broadcast to all connected browsers.
Selecting a tab, hiding the editor, and zooming are local to each viewer.

Use the **+** after the tabs to create a diagram. The **×** on each tab opens
its delete confirmation; keyboard users can focus a tab and press Delete.
The last tab cannot be removed, and unsaved drafts must save before closing.

Scroll over the preview to zoom toward the pointer, or drag with the left or
middle mouse button to pan. **Fit** centers the entire diagram again. The canvas
also accepts arrow keys to pan, +/− to zoom, and 0 to fit. Zoom and pan survive
live renders and theme changes; switching tabs resets the view. Diagram boxes use
the shared neutral one-pixel border and six-pixel control radius.

Source saves automatically after a short typing pause, including incomplete
syntax. Invalid syntax displays an error and keeps the last valid preview visible.
Export the current valid diagram as SVG. The editor supports four-space Tab
indentation and Ctrl/Cmd+Enter to save immediately. Tabs support arrow keys,
Home, and End for keyboard navigation.

## Storage and collaboration

The server writes `.data/workspace.json` atomically before broadcasting each
change. The file lives in the container's writable layer by default: it survives
restarting the **same container**, and disappears when the container is removed
or replaced (including a Kubernetes rollout). No volume is required. There is no
browser-local saved workspace and no external database.

Use **one replica**. Multiple containers have separate files and separate live
connections. Everyone who can reach the site can edit every tab; there are no
accounts, rooms, or private links. An ingress can provide access control if desired.
Mermaid uses strict rendering security, with HTML and click callbacks disabled.
All runtime JavaScript, including Mermaid, is served from this app; no CDN is
required.

Edits carry a tab revision. If two people edit the same tab concurrently, the
second write is rejected and that person's draft stays in their editor. They can
choose the shared source or explicitly save their own. Disconnected drafts stay
in the open page and retry after reconnection; closing the page with unsaved work
triggers a browser warning. If someone deletes a tab being edited, its draft
remains available to copy. This is whole-source conflict detection, not character
by character collaborative editing. Source is limited to 100,000 characters per
tab; tab names are limited to 60 characters. At least one tab must remain.

## Development

Requires Node.js 22.12 or newer.

```sh
cd mermaid
npm ci
npm run dev
```

Open http://localhost:5173. Vite serves the editor and the Node server handles the
API and event stream on the same port. Development data lives in the ignored
`.data/` directory. Set `PORT` or `DATA_DIR` to override either default.

```sh
npm run check
npm test
npm run build
npm start
```

`npm start` serves the production build and API without installing development
packages at runtime. Tests cover storage across restarts, concurrent edits,
concurrent creation at the tab limit, validation, and HTTP event delivery.

## Container

From the repository root:

```sh
docker build -t mermaid:latest mermaid
docker run --rm -p 8085:80 mermaid:latest
```

The image listens on port 80, runs as the unprivileged `node` user, and exposes
`/healthz` for probes. The build needs npm access; the running container needs no
outbound access, secrets, or mounted storage. The existing publishing workflow
automatically discovers this app and publishes
`ghcr.io/carter-apas/mermaid:latest` after its changes are pushed to `main`.

Route `mermaid.coder.kiwi` to the container in your existing ingress configuration.
Allow long-lived HTTP responses for `GET /api/events` (Server-Sent Events), disable
proxy buffering for that route, and use an idle timeout above the 15-second
heartbeat interval. The server also sends `X-Accel-Buffering: no`. WebSocket
upgrades are unnecessary. Keep the writable layer enabled for `/app/.data`.

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
