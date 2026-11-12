local root = app.params.root or app.fs.currentPath
local sprite = Sprite(640, 400, ColorMode.RGB)
local image = Image{ fromFile=root .. "/art/garden-layer-meadow.png" }
local layer = sprite:newLayer()
layer.name = "Meadow"
sprite:newCel(layer, 1, image, Point(0, 0))
local image = Image{ fromFile=root .. "/art/garden-layer-gathering-clearing.png" }
local layer = sprite:newLayer()
layer.name = "Gathering clearing"
sprite:newCel(layer, 1, image, Point(0, 0))
local image = Image{ fromFile=root .. "/art/garden-layer-trees-and-hedges.png" }
local layer = sprite:newLayer()
layer.name = "Trees and hedges"
sprite:newCel(layer, 1, image, Point(0, 0))
local image = Image{ fromFile=root .. "/art/garden-layer-fence-and-stepping-stones.png" }
local layer = sprite:newLayer()
layer.name = "Fence and stepping stones"
sprite:newCel(layer, 1, image, Point(0, 0))
local image = Image{ fromFile=root .. "/art/garden-layer-vegetable-beds.png" }
local layer = sprite:newLayer()
layer.name = "Vegetable beds"
sprite:newCel(layer, 1, image, Point(0, 0))
local image = Image{ fromFile=root .. "/art/garden-layer-flowers-and-garden-details.png" }
local layer = sprite:newLayer()
layer.name = "Flowers and garden details"
sprite:newCel(layer, 1, image, Point(0, 0))
sprite:deleteLayer(sprite.layers[1])
sprite:saveAs(root .. "/art/garden.aseprite")
