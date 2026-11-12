local root=app.params.root or app.fs.currentPath
local folder=root..'/hot-potato/'
local function inside(x,y) return (x>=8 and x<=25 and y>=50 and y<=77) or (x>=39 and x<=56 and y>=50 and y<=77) end
for _,name in ipairs({'male','female'}) do
  local source=Image{fromFile=folder..'art/concepts/fidelity-study/'..name..'-64x96.png'}
  local still=Image{fromFile=folder..'public/assets/'..name..'.png'}
  local idle=Image{fromFile=folder..'public/assets/'..name..'-idle.png'}
  local hold=Image{fromFile=folder..'public/assets/'..name..'-hold.png'}
  local charred=Image{fromFile=folder..'public/assets/'..name..'-charred.png'}
  local down=Image{fromFile=folder..'public/assets/'..name..'-down.png'}
  assert(still.width==64 and still.height==96 and charred.width==64 and charred.height==96 and down.width==64 and down.height==96,'Still dimensions mismatch')
  assert(idle.width==128 and idle.height==96 and hold.width==128 and hold.height==96,'Sheet dimensions mismatch')
  local edited=0
  for y=0,95 do for x=0,63 do
    local p=source:getPixel(x,y)
    assert(still:getPixel(x,y)==p,'Approved still pixel mismatch')
    assert(idle:getPixel(x,y)==p,'Idle frame one differs from approved source')
    local shifted=y<95 and source:getPixel(x,y+1) or 0
    assert(idle:getPixel(x+64,y)==shifted,'Idle frame two is not a one-pixel bob')
    if not inside(x,y) then assert(hold:getPixel(x,y)==p,'Holding edit outside local arm windows') elseif hold:getPixel(x,y)~=p then edited=edited+1 end
    assert(app.pixelColor.rgbaA(charred:getPixel(x,y))==app.pixelColor.rgbaA(p),'Charred silhouette changed')
    if app.pixelColor.rgbaA(down:getPixel(x,y))>0 then assert(y<=94,'Prone state below baseline') end
  end end
  local sprite=app.open(folder..'art/characters-'..name..'.aseprite')
  assert(#sprite.frames==6 and #sprite.tags==4,'Native states mismatch')
  for f=1,4 do assert(math.abs(sprite.frames[f].duration-0.45)<0.001,'Animation duration mismatch') end
  local arms=sprite.layers[2]:cel(3)
  local armsNext=sprite.layers[2]:cel(4)
  assert(arms.position==armsNext.position,'Hand cel moved')
  assert(arms.image.width==armsNext.image.width and arms.image.height==armsNext.image.height,'Hand cel size changed')
  for y=0,arms.image.height-1 do for x=0,arms.image.width-1 do
    local p=arms.image:getPixel(x,y)
    assert(p==armsNext.image:getPixel(x,y),'Hands moved between holding frames')
    if app.pixelColor.rgbaA(p)>0 then
      local px,py=x+arms.position.x,y+arms.position.y
      assert(hold:getPixel(px,py)==hold:getPixel(px+64,py),'Visible hand pixels changed between frames')
    end
  end end
  for _,anchor in ipairs({{22,62},{42,62}}) do assert(app.pixelColor.rgbaA(hold:getPixel(anchor[1],anchor[2]))==255,'Hand anchor is transparent') end
  local file=io.open(folder..'art/characters-'..name..'.json','r');local metadata=json.decode(file:read('*a'));file:close()
  assert(metadata.meta.anchors.leftHand.x==22 and metadata.meta.anchors.leftHand.y==62,'Left hand metadata mismatch')
  assert(metadata.meta.anchors.rightHand.x==42 and metadata.meta.anchors.vegetable.x==32,'Anchor metadata mismatch')
  print(name..': exact still/idle1, one-pixel bob, '..edited..' local arm edits, fixed hands, exact charred alpha, six native frames and anchors verified')
end
