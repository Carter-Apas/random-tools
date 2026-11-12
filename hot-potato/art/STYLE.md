# Hot Potato art direction

Original pixel art inspired by the readability and proportions of handheld RPGs of the early 2000s. Do not copy Pokémon or Krillion assets. A sunny allotment garden, earthy outlines, leaf green, butter yellow, terracotta, and cornflower blue. Every asset uses hard pixel edges, no antialiasing, no gradients. Render with nearest-neighbour scaling.

## Palette

Outline #343b32, deep foliage #365e38, grass shadow #68934b, grass #8db65d, grass light #aacb72, cream #fff3ce, pale yellow #f7d77c, wood #9b6241, wood light #cd9561, soil #b99a6a, soil light #d8bd86, coral #df6550, blue #668cc4. Skin #f3c799 with #ce9275 shading; hair #654837 and #9b6644. Transparent backgrounds for sprites.

## Characters

32x40 pixel original compact overworld characters, with large readable heads,
short legs, and clear handheld-RPG silhouettes. Boy: rust-red cap, navy jacket,
cream shirt and dark shorts. Girl: cream headband, auburn hair, green top and
coral shorts. Idle and holding poses have two-frame 64x40 sheets. Upright
charred recovery and prone charred elimination poses use single 32x40 PNGs.
Editable Aseprite sources are required. Detailed anchors are below.

## Garden

640x400 pixel top-down garden scene for a 1.6 aspect arena. Sunny grass clearing with large empty elliptical dirt gathering space centred at (320,215), radii (210,135). Leave centre and player positions clear. Fence along top, hedges/trees at edges, garden beds bottom corners, tiny flowers and stones. No people, no text, no campfire (separate sprite). Original, lovingly composed tile-like pixel art. Export garden.png and editable .aseprite. Main UI uses image as background scaled to cover.

## Props and controls

Vegetables are 24x24 single PNGs with transparent background: potato, carrot, beetroot, turnip, pumpkin, corn, aubergine, tomato. Give each a charming small face and distinct silhouette. Campfire 48x48, eight frames in a horizontal 384x48 sheet fire.png; single preview fire-still.png. Warm-hands, burning-hands and full-body heat overlays each use four 32x40 frames in a 128x40 sheet. heart.png and heart-empty.png 12x12; crown.png 24x24. Wood button nine-slice-ready texture button-wood.png 48x24 and green button-green.png same dimensions, clean flat centres without text. All original and editable .aseprite sources. Group props into source sheets where useful, document layout.

## UI

Garden is the memorable visual. Sky-blue page background, parchment panels with chunky earthy borders and offset shadows, compact soft pixel typography with a readable sans serif for instructions and form inputs. Centre-aligned game title; game board plus a focused prompt below. Mobile stacks naturally with 44px minimum controls, no hover-only action. Motion answers gameplay: vegetable travels from player to fire to next player, flames flicker, percentage heat stages build to charring and heart loss. Reduced motion supported.

## Revision: readable handheld RPG characters and heat

Use more compact original Gen III-era overworld human proportions: 32x40 transparent canvas, head around x8–24/y5–20, compact torso y20–30, short legs y30–37, baseline y38. A deliberate overhead/front view with simple shaded face, small dark eyes, coherent rounded head silhouette, clear cap/bandana and backpack details. Avoid the long narrow bodies and wide awkward elbows of the first draft. Boy: rust-red cap, navy jacket/cream shirt, dark shorts/trousers, small backpack. Girl: cream headband, auburn hair, forest-green top, warm coral shorts, small backpack. Original designs, no ripped or traced Pokémon sprites.

For each avatar, export name.png (32x40), name-idle.png (64x40 two frames), name-hold.png (64x40 two frames), name-charred.png (32x40 upright comic soot silhouette), name-down.png (32x40 prone charred figure on ground). Holding pose has both clearly visible hands at (10,25) and (22,25), cupped around centre (16,24); this is also the vegetable anchor. Character source files retain editable layers and frames.

Heat overlays align to the same 32x40 character canvas and are exported as 4-frame horizontal 128x40 sheets: heat-warm.png (red glowing/hot hands and tiny heat wisps), heat-hands.png (small flames on hands), heat-body.png (flames enveloping body with face still readable). Effects must align hands around x10/22,y25. Full-body flame can rise towards y3. Hard pixel art and transparent background. Timing: 100ms/frame. Campfire gets 8 distinct 48x48 frames (384x48) at 100ms/frame with lively bending tongues, sparks and embers; fire-still.png stays 48x48. Potato is a recognisably elongated, asymmetric, knobbly potato with skin eyes, around 20x12 pixels on the 24x24 canvas, no circular ball silhouette.

Garden fence must have a clearly readable silhouette without trees covering its rails or posts. Keep tree canopies behind/above fence line and end hedge trees away from posts. Keep the gathering clearing unchanged. No dotted page background. Use a legible retro typeface for headings and controls; reserve the existing pixel font for the short logo only if needed. Gameplay heat replaces exploding-vegetable artwork.
