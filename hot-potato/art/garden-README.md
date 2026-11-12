# Garden arena

`../public/assets/garden.png` is an original 640 × 400 pixel arena. Render using nearest-neighbour scaling. The gathering clearing is centred at approximately (320, 215), with horizontal radius 210 and vertical radius 135. No fire or characters are baked into the image.

`garden.aseprite` contains six editable layers: Meadow, Gathering clearing, Trees and hedges, Fence and stepping stones, Vegetable beds, Flowers and garden details. Trees sit behind the fence; their canopies end above the post tips, and side trees begin below the rails. The fence has an uninterrupted readable silhouette.

The generator draws at 320 × 200 then scales by exactly two for the intended handheld-game texture. To reproduce using Python with Pillow installed:

```sh
python art/garden-generate.py
aseprite -b --script-param root="$PWD" --script art/garden-import.lua
```

Run from the `hot-potato` directory. Generated layer PNGs are inputs to the Aseprite import script and are also available for editing individually. Generation uses a fixed random seed. The import script accepts the app root as a parameter and contains no machine-specific paths. All artwork is original; no third-party game assets were used.
