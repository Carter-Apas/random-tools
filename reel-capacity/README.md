# Reel capacity

A browser-only fishing reel capacity calculator with a black and purple glass
interface. Enter a known line length in metres or yards and its diameter in mm
or PE size. See a custom target capacity and a comparison across 28 PE sizes
(0.1–30) or 55 diameters (0.06–0.60 mm). Both length units are always shown.

Changing an input unit converts its current value. Select a comparison size to
use it as the target. Export the active comparison as CSV, including the known
capacity used to calculate it. Inputs and view are saved in browser local storage;
the calculator still works if storage is unavailable. Reset restores the example.

## Development

Requires Node.js 20 or newer. No dependencies or installation step.

```sh
cd reel-capacity
npm run dev
```

Open http://localhost:5173. Set `PORT` to use a different port.

```sh
npm run check
npm test
```

## Calculation

`target length = known length × (known diameter / target diameter)²`

This models a fixed spool volume and identical packing, tension, backing and
fill level. It is an estimate; coatings and braid construction affect real capacity.
1 yard is exactly 0.9144 metres. Outputs round to the nearest whole unit (positive
lengths below 0.5 display as `<1`), while calculations retain their precision.

PE is a linear density rating, not a universal diameter. PE input is converted to
approximate diameter using the PE table in
[VARIVAS's line size reference](https://www.varivas.fishing/japanese-fishing-line-size/).
This is specifically its PE table, not its nylon/fluorocarbon diameter table.
Intermediate PE sizes interpolate cross-sectional area between adjacent entries;
the inverse uses the same calculation. No extrapolation is performed. The same
diameter-squared calculation is used for both mm and PE inputs, so capacity scales
by the reference diameters rather than exactly by PE number. Prefer the braid's
stated diameter when known. The reference and assumptions are also linked in the UI.

## Container

From the repository root:

```sh
docker build -t reel-capacity:latest reel-capacity
docker run --rm -p 8084:80 reel-capacity:latest
```

The static nginx container listens on port 80 and exposes `/healthz`. No backend,
volumes, credentials or outbound requests are required. The development server
also exposes `/healthz`. The repo's existing workflow discovers the Dockerfile
and publishes `ghcr.io/carter-apas/reel-capacity:latest` on the next main push.
