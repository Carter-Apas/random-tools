# Overworld characters

Original front-facing pixel characters made in Aseprite using `characters.lua`.
The boy wears a rust-red cap, navy jacket, cream shirt, dark shorts and a tan
backpack. The girl wears a cream headband, auburn hair, forest-green top, coral
shorts and a tan backpack. The artwork follows the revised handheld RPG direction
in STYLE.md without downloaded, traced or copied game sprites.

Each character uses a 32 × 40 transparent canvas, with boots on the y = 38
baseline. Headwear and hair create a rounded silhouette above a compact torso.
Holding frames cup both hands around the vegetable anchor at (16, 24), with
palms at approximately (10, 25) and (22, 25). Hand positions remain fixed between
holding frames so the vegetable and heat overlays align during the idle motion.

Each `characters-*.aseprite` source has five editable layers and six tagged
frames:

| Tag | Frames | Export | Dimensions | Frame duration |
| --- | --- | --- | --- | --- |
| Idle | 1–2 | `male-idle.png`, `female-idle.png` | 64 × 40 | 450 ms |
| Hold | 3–4 | `male-hold.png`, `female-hold.png` | 64 × 40 | 450 ms |
| Charred | 5 | `male-charred.png`, `female-charred.png` | 32 × 40 | 900 ms |
| Down | 6 | `male-down.png`, `female-down.png` | 32 × 40 | 900 ms |

`male.png` and `female.png` are the first idle frame. Upright charred characters
use soot, ash flecks and tiny visible eyes. Down characters lie prone near the
baseline, with a horizontal soot silhouette and comic crossed eyes. Render all
art with nearest-neighbour scaling; keep holding frame one for reduced motion.

From the repository root, regenerate editable sources and exported assets:

```sh
aseprite -b --script-param root="$PWD" --script hot-potato/art/characters.lua
for avatar in male female; do
  aseprite -b --tag Idle "hot-potato/art/characters-$avatar.aseprite" --sheet-type horizontal --sheet "hot-potato/public/assets/$avatar-idle.png" --data "hot-potato/art/characters-$avatar.json" --list-tags --list-layers
  aseprite -b --tag Hold "hot-potato/art/characters-$avatar.aseprite" --sheet-type horizontal --sheet "hot-potato/public/assets/$avatar-hold.png"
  aseprite -b --tag Charred "hot-potato/art/characters-$avatar.aseprite" --save-as "hot-potato/public/assets/$avatar-charred.png"
  aseprite -b --tag Down "hot-potato/art/characters-$avatar.aseprite" --save-as "hot-potato/public/assets/$avatar-down.png"
  aseprite -b --frame-range 0,0 "hot-potato/art/characters-$avatar.aseprite" --save-as "hot-potato/public/assets/$avatar.png"
done
```
