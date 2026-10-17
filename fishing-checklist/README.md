# Fishing checklist

A small, mobile-friendly packing checklist with three sections:

- **General:** rods, reels, tacklebox, bag, dry bag, rags, icebox / bucket.
- **Boat:** VHF radio, boat, wheels, oars, lifejackets, pump, electric pump, gas tank,
  2-stroke oil, outboard.
- **Rock fishing:** rock rod, rock reel, burley, bait, rope, ground / rock stake.

Each category groups gear you'd pack together: rods and reels plus tackle and
essentials in General; outboard, safety, and boat gear in Boat; rods and reels,
bait and burley, and rock setup in Rock fishing.

Tick items to update the section and overall progress. General gear is for every
trip; use whichever specialist section you need. The overall counter includes all
23 items across all three sections. Reset checklist opens a confirmation before
clearing all ticks.

Ticking an item plays a soft pop with a brief checkbox bounce and particle burst.
Finishing a category plays a two-note chime. The header's Sound button mutes or
enables audio and remembers the preference. Sounds are generated locally without
audio downloads. Reduced-motion settings disable the animations.

Progress is stored in local storage in the current browser, per origin. It
survives refreshes and container restarts, but does not sync between devices or
browsers. If browser storage is blocked, the checklist still works for the current
page and displays a notice. There is no backend, database, external font, or API.

## Local development

For a quick preview, open `public/index.html` directly in your browser. Saving
progress on `file://` pages depends on the browser; use the local server below
for consistent storage behaviour.

Requires Node.js 22 or newer. No dependencies to install and no build step.

```sh
cd fishing-checklist
npm run dev
```

Open `http://localhost:5173`. Refresh after editing frontend files. Set `PORT` to
override the development port. Run `npm run check` to check JavaScript syntax.

## Docker

From the repository root:

```sh
docker build -t fishing-checklist:latest fishing-checklist
docker run --rm -p 8082:80 fishing-checklist:latest
```

Open `http://localhost:8082`. The image serves static files with nginx on port 80.
No environment variables or volumes are needed. `/healthz` returns HTTP 200 for
container and Kubernetes health checks.

The existing publishing workflow automatically discovers this Dockerfile and
publishes `ghcr.io/carter-apas/fishing-checklist:latest` on the next push to main.

## Kubernetes

Use this image in your homelab manifests with `containerPort: 80`, a Service
targeting port 80, and your usual ingress. Serve it at the root of its own host.
Use `imagePullPolicy: Always` for the `latest` tag. Example container settings:

```yaml
containers:
  - name: fishing-checklist
    image: ghcr.io/carter-apas/fishing-checklist:latest
    imagePullPolicy: Always
    ports:
      - containerPort: 80
        name: http
    readinessProbe:
      httpGet:
        path: /healthz
        port: http
    livenessProbe:
      httpGet:
        path: /healthz
        port: http
      initialDelaySeconds: 5
      periodSeconds: 30
    resources:
      requests:
        cpu: 10m
        memory: 16Mi
      limits:
        memory: 64Mi
```

Configure an image pull secret if the GHCR package is private. After publishing,
restart your deployment to pull the new image. Browser state stays intact as long
as you keep the same origin.
