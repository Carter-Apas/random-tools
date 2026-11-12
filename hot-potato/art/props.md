# Game props

All props are original pixel art drawn through Aseprite's Lua API. Native sources are
`props-<asset>.aseprite` in this directory. Each source contains editable pixels;
the campfire source contains eight frames and each heat effect source contains
four frames. Every PNG has a transparent RGBA background and uses hard pixel
edges.

Regenerate from the repository root with:

```sh
aseprite -b --script hot-potato/art/props.lua
```

Optional script parameters `output` and `source` change the export directories.
Include a trailing slash when overriding either directory.

| PNG                | Size     | Layout                                                  |
| ------------------ | -------- | ------------------------------------------------------- |
| `potato.png`       | 24 × 24  | Elongated, asymmetric, knobbly potato with skin eyes    |
| `carrot.png`       | 24 × 24  | Single vegetable                                        |
| `beetroot.png`     | 24 × 24  | Single vegetable                                        |
| `turnip.png`       | 24 × 24  | Single vegetable                                        |
| `pumpkin.png`      | 24 × 24  | Single vegetable                                        |
| `corn.png`         | 24 × 24  | Single vegetable                                        |
| `aubergine.png`    | 24 × 24  | Single vegetable                                        |
| `tomato.png`       | 24 × 24  | Single vegetable                                        |
| `fire.png`         | 384 × 48 | Eight 48 × 48 frames, left to right; 100 ms/frame; loop |
| `fire-still.png`   | 48 × 48  | Original first fire frame for reduced motion            |
| `heat-warm.png`    | 128 × 40 | Four 32 × 40 frames; 100 ms/frame; loop                 |
| `heat-hands.png`   | 128 × 40 | Four 32 × 40 frames; 100 ms/frame; loop                 |
| `heat-body.png`    | 128 × 40 | Four 32 × 40 frames; 100 ms/frame; loop                 |
| `heart.png`        | 12 × 12  | Filled heart                                            |
| `heart-empty.png`  | 12 × 12  | Empty heart                                             |
| `crown.png`        | 24 × 24  | Winner crown                                            |
| `button-wood.png`  | 48 × 24  | Nine-slice texture; 6 px border; flat centre            |
| `button-green.png` | 48 × 24  | Nine-slice texture; 6 px border; flat centre            |

Heat overlays use the character's 32 × 40 canvas. Align their top-left corner with
the character sprite. Hands sit around `(10, 25)` and `(22, 25)`; the vegetable
anchor is `(16, 24)`. Warm hands glow red with rising wisps, hand flames flicker
independently, and the body effect rises along both sides while preserving the
central face area. The campfire varies its tongue direction, height, sparks, and
embers over an 800 ms loop. The unused explosion artwork has been removed.

Render all assets with `image-rendering: pixelated`. Vegetable face placement and
silhouette remain readable at 24 px; 2× or 3× scale is preferred in gameplay.
