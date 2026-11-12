# Approved A: exact artwork fidelity study

These study files extract the actual approved A pair from
`../character-options.png`. The extraction does not redraw, recolor or simplify
characters. The user subsequently approved the 64×96 outputs as production
animation bases; see `../../characters.md` for the runtime sprites.

Open `comparison.png` for the original crops beside transparent cutouts at half
source size, followed by 32 × 48, 48 × 72 and 64 × 96 canvases at 1× and 2×.
The checkerboard exists only in the comparison. Individual still PNGs are
transparent, with matching editable single-frame Aseprite files.

**64 × 96 is recommended for preserving the approved concept's face, clothing,
proportions and silhouette.** The smaller sizes are included for comparison.

## Extraction

Aseprite reads the whole A artwork area at (20, 140), size 580 × 455. A boundary
seeded, four-connected flood mask removes the contiguous olive background,
referenced against RGB (190, 193, 146). Keeping the two main connected foreground
figures excludes the neighboring boy fragment from the girl's crop. Every retained
source pixel keeps its exact original color; background pixels become transparent.
There is no edge recoloring or manual pixel cleanup.

| Figure | Original silhouette bounds | Full cutout canvas | Retained source pixels |
| ------ | -------------------------- | ------------------ | ---------------------- |
| Boy    | (34, 162), 274 × 423       | 282 × 455          | 74,953                 |
| Girl   | (307, 154), 283 × 433      | 291 × 455          | 78,186                 |

The boy's full leaf extends to source x = 307. Full cutouts include four pixels
of horizontal margin. Their Aseprite files retain a hidden original-crop layer
and a visible exact-cutout layer. `extraction.json` records coordinates and counts.

## Shared scaling

Both figures use the same uniform nearest-neighbour scale for each canvas:
`min(target width / 291, target height / 455)`. They retain the shared source
origin at y = 140 and source baseline, with horizontal centering. Neither figure
is stretched or independently normalized to fill its canvas.

## Reproduce and verify

From the repository root:

```sh
aseprite -b --script-param root="$PWD" --script hot-potato/art/concepts/fidelity-study/extract.lua
aseprite -b --script-param root="$PWD" --script hot-potato/art/concepts/fidelity-study/preview.lua
aseprite -b --script-param root="$PWD" --script hot-potato/art/concepts/fidelity-study/verify.lua
```

Verification passes for all 153,139 retained source pixels, foreground counts,
all six native dimensions and every nearest-neighbour output sample. Original
crops, exact cutouts and the comparison were visually inspected.
