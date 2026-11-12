# Approved Garden trainers: production animations

Production frames derive directly from the approved exact 64 × 96 cutouts in
`concepts/fidelity-study/`. The first idle frame and standalone `male.png` /
`female.png` are pixel-identical to those approved PNGs. The face, fringe,
headwear, clothing and proportions are preserved from the artwork itself.

Each editable `characters-*.aseprite` has six frames and three layers: approved
artwork/derived body, locally rearranged cuffs and cupped hands, and soot eyes/ash.

| Tag     | Native frames | Export                                   | Dimensions | Frame duration |
| ------- | ------------- | ---------------------------------------- | ---------- | -------------- |
| Idle    | 1–2           | `male-idle.png`, `female-idle.png`       | 128 × 96   | 450 ms         |
| Hold    | 3–4           | `male-hold.png`, `female-hold.png`       | 128 × 96   | 450 ms         |
| Charred | 5             | `male-charred.png`, `female-charred.png` | 64 × 96    | 900 ms         |
| Down    | 6             | `male-down.png`, `female-down.png`       | 64 × 96    | 900 ms         |

Idle frame two moves the approved artwork upward by one pixel. Holding changes
only the local arm windows x = 8–25 / 39–56, y = 50–77. Source cuff pixels are
rearranged and small cupped palms use colors sampled from the original arm. The
windows extend through y = 77 to remove the original hanging hands' outlines.
The rest of holding frame one is identical to the approved source. Holding frame
two bobs the body one pixel while the hands remain fixed.

Anchors on the 64 × 96 canvas are left palm **(22, 62)**, right palm **(42, 62)**,
vegetable **(32, 62)** and ground baseline **94**. These are recorded in
`characters-layout.json` and both exported Aseprite JSON metadata files.

The upright charred state maps the approved source colors to soot tones without
changing its alpha silhouette, then adds visible comic eyes and small ash marks.
The down state rotates and uniformly shrinks that same soot figure onto its side,
retaining its cap/ponytail silhouette, with crossed eyes and its bottom at y = 94.
Render all exports with nearest-neighbour scaling. Reduced motion uses frame one.

`characters-animation-preview-1x.png` and `-3x.png` show the six states from left
to right, with the boy above the girl.

## Rebuild and verify

From the repository root:

```sh
aseprite -b --script-param root="$PWD" --script hot-potato/art/characters.lua
for avatar in male female; do
  aseprite -b --tag Idle "hot-potato/art/characters-$avatar.aseprite" --sheet-type horizontal --sheet "hot-potato/public/assets/$avatar-idle.png" --data "hot-potato/art/characters-$avatar.json" --list-tags --list-layers
  aseprite -b --tag Hold "hot-potato/art/characters-$avatar.aseprite" --sheet-type horizontal --sheet "hot-potato/public/assets/$avatar-hold.png"
  aseprite -b --tag Charred "hot-potato/art/characters-$avatar.aseprite" --save-as "hot-potato/public/assets/$avatar-charred.png"
  aseprite -b --tag Down "hot-potato/art/characters-$avatar.aseprite" --save-as "hot-potato/public/assets/$avatar-down.png"
  aseprite -b --frame-range 0,0 "hot-potato/art/characters-$avatar.aseprite" --save-as "hot-potato/public/assets/$avatar.png"
done
aseprite -b --script-param root="$PWD" --script hot-potato/art/characters-metadata.lua
aseprite -b --script-param root="$PWD" --script hot-potato/art/characters-preview.lua
aseprite -b --script-param root="$PWD" --script hot-potato/art/characters-verify.lua
```

Verification checks every approved still/idle pixel, the one-pixel bob, local arm
edit bounds, fixed visible hand pixels, anchor opacity, charred alpha identity,
prone baseline, native frame/tag counts, timing and anchor metadata. All pass.
