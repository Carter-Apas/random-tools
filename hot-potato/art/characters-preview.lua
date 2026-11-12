local root=app.params.root or app.fs.currentPath
local folder=root..'/hot-potato/art/'
local image=Image(384,192,ColorMode.RGB)
for row,avatar in ipairs({'male','female'}) do
  local sprite=app.open(folder..'characters-'..avatar..'.aseprite')
  for f=1,6 do image:drawSprite(sprite,f,Point((f-1)*64,(row-1)*96)) end
end
local preview=Sprite(384,192,ColorMode.RGB)
local background=Image(384,192,ColorMode.RGB)
for it in background:pixels() do it(Color{r=190,g=203,b=143}.rgbaPixel) end
preview.layers[1].name='Garden preview background';preview:newCel(preview.layers[1],1,background)
local artwork=preview:newLayer();artwork.name='Idle1 Idle2 Hold1 Hold2 Charred Down';preview:newCel(artwork,1,image)
preview:saveAs(folder..'characters-animation-preview-1x.png')
app.command.SpriteSize{ui=false,width=1152,height=576,method='nearest'}
preview:saveAs(folder..'characters-animation-preview-3x.png')
