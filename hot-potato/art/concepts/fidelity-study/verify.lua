local root=app.params.root or app.fs.currentPath
local folder=root..'/hot-potato/art/concepts/fidelity-study/'
local source=Image{fromFile=root..'/hot-potato/art/concepts/character-options.png'}
local file=io.open(folder..'extraction.json','r');local metadata=json.decode(file:read('*a'));file:close()
local counts={}
local largestWidth=0
for _,figure in ipairs(metadata.figures) do largestWidth=math.max(largestWidth,figure.cropBounds.width) end
for _,figure in ipairs(metadata.figures) do
  local cutout=Image{fromFile=folder..figure.name..'-exact-cutout.png'}
  local count=0
  for y=0,cutout.height-1 do for x=0,cutout.width-1 do
    local p=cutout:getPixel(x,y)
    if app.pixelColor.rgbaA(p)>0 then
      assert(app.pixelColor.rgbaA(p)==255,'Unexpected partial alpha')
      assert(p==source:getPixel(figure.cropBounds.x+x,figure.cropBounds.y+y),'Source color mismatch')
      count=count+1
    end
  end end
  assert(count==figure.pixels,'Foreground count mismatch')
  for _,size in ipairs({{32,48},{48,72},{64,96}}) do
    local canvas=Image{fromFile=folder..figure.name..'-'..size[1]..'x'..size[2]..'.png'}
    assert(canvas.width==size[1] and canvas.height==size[2],'Canvas dimensions mismatch')
    local scale=math.min(size[1]/largestWidth,size[2]/455)
    local offset=(size[1]-cutout.width*scale)/2
    for y=0,canvas.height-1 do for x=0,canvas.width-1 do
      local sx=math.floor((x+0.5-offset)/scale);local sy=math.floor((y+0.5)/scale)
      local expected=0
      if sx>=0 and sx<cutout.width and sy>=0 and sy<cutout.height then expected=cutout:getPixel(sx,sy) end
      assert(canvas:getPixel(x,y)==expected,'Nearest-neighbour sample mismatch')
    end end
  end
  counts[#counts+1]=figure.name..': '..count..' source pixels verified; three native canvas sizes verified'
end
print(table.concat(counts,'\n'))
