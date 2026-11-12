# Hot Potato art direction

Original pixel art inspired by the readability and proportions of handheld RPGs of the early 2000s. Do not copy Pokémon or Krillion assets. A sunny allotment garden, earthy outlines, leaf green, butter yellow, terracotta, and cornflower blue. Every asset uses hard pixel edges, no antialiasing, no gradients. Render with nearest-neighbour scaling.

## Palette

Outline #343b32, deep foliage #365e38, grass shadow #68934b, grass #8db65d, grass light #aacb72, cream #fff3ce, pale yellow #f7d77c, wood #9b6241, wood light #cd9561, soil #b99a6a, soil light #d8bd86, coral #df6550, blue #668cc4. Skin #f3c799 with #ce9275 shading; hair #654837 and #9b6644. Transparent backgrounds for sprites.

## Characters

The user-approved A (Garden trainers) source is preserved in
`art/concepts/character-options.png`. The approved native masters are
`art/concepts/fidelity-study/male-64x96.png` and `female-64x96.png`.
Production idle frame one must match these exact 64x96 RGBA pixels. Do not redraw,
reshape, recolor or compress their proportions. Pose edits are local to the arms.

Frames use 64x96 transparent canvases. Idle and Hold have two frames in 128x96
horizontal sheets; Charred and Down use single 64x96 frames. Both avatars keep
the same source scale/baseline. Holding palms are at (22,62) and (42,62), with the
vegetable centred at (32,62). The head, face, hair, clothing and legs retain the
approved pixels outside the local arm windows. Keep movement subtle, around one
native pixel, with 450 ms idle/hold frames. Upright soot and prone soot states
remain recognisable derivatives of the same artwork.

Native resolution stays 64x96. The browser displays 64x96 on desktop and 48x72 on
small screens; crowded mobile rooms can display 40x60 with extra arena height.
Always preserve the 2:3 ratio with nearest-neighbour scaling. Editable Aseprite
sources, source extraction and reproducible animation scripts stay in `art/`.

## Garden

640x400 pixel top-down garden scene for a 1.6 aspect arena. Sunny grass clearing with large empty elliptical dirt gathering space centred at (320,215), radii (210,135). Leave centre and player positions clear. Fence along top, hedges/trees at edges, garden beds bottom corners, tiny flowers and stones. No people, no text, no campfire (separate sprite). Original, lovingly composed tile-like pixel art. Export garden.png and editable .aseprite. Main UI uses image as background scaled to cover.

## Props and controls

Vegetables are 24x24 single PNGs with transparent background: potato, carrot, beetroot, turnip, pumpkin, corn, aubergine, tomato. Give each a charming small face and distinct silhouette. Campfire 48x48, eight frames in a horizontal 384x48 sheet fire.png; single preview fire-still.png. Warm-hands, burning-hands and full-body heat overlays each use four 64x96 frames in a 256x96 sheet. heart.png and heart-empty.png 12x12; crown.png 24x24. Wood button nine-slice-ready texture button-wood.png 48x24 and green button-green.png same dimensions, clean flat centres without text. All original and editable .aseprite sources. Group props into source sheets where useful, document layout.

## UI

Garden is the memorable visual. Sky-blue page background, parchment panels with chunky earthy borders and offset shadows, compact soft pixel typography with a readable sans serif for instructions and form inputs. Centre-aligned game title; game board plus a focused prompt below. Mobile stacks naturally with 44px minimum controls, no hover-only action. Motion answers gameplay: vegetable travels from player to fire to next player, flames flicker, percentage heat stages build to charring and heart loss. Reduced motion supported.

## Heat and scenery contract

Heat overlays share the character's 64x96 grid. Warm hand centres and flame bases
align with (22,62) and (42,62). Preserve the existing warm wisps, flame shapes,
colours and central face gap while mapping onto this grid. Each effect uses four
frames at 100 ms per frame. The campfire keeps eight 48x48 frames in a 384x48
sheet, with bending tongues, sparks and embers; `fire-still.png` is its first frame.

The potato is an elongated asymmetric shape around 20x12 on a 24x24 canvas.
The garden fence keeps a clear silhouette, with canopies above the posts and
side trees away from rails. The page background is flat sky blue. Chakra Petch
is the readable retro interface font, with Pixelify Sans reserved for the logo.
Gameplay heat builds through the hands and body into charring and heart loss.
