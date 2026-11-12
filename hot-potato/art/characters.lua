local root=app.params.root or app.fs.currentPath
local folder=root..'/hot-potato/art/'
local approved=folder..'concepts/fidelity-study/'
local clear=0
local function clone(image) return Image(image) end
local function pixel(im,x,y,p) if x>=0 and x<im.width and y>=0 and y<im.height then im:drawPixel(x,y,p) end end
local function rect(im,x,y,w,h,p) for yy=y,y+h-1 do for xx=x,x+w-1 do pixel(im,xx,yy,p) end end end
local function bob(im)
  local result=Image(64,96,ColorMode.RGB)
  for y=1,95 do for x=0,63 do result:drawPixel(x,y-1,im:getPixel(x,y)) end end
  return result
end
local function sourceColor(im,region,target)
  local best,distance=0,math.huge
  for y=region[2],region[4] do for x=region[1],region[3] do
    local p=im:getPixel(x,y)
    if app.pixelColor.rgbaA(p)>0 then local d=(app.pixelColor.rgbaR(p)-target[1])^2+(app.pixelColor.rgbaG(p)-target[2])^2+(app.pixelColor.rgbaB(p)-target[3])^2;if d<distance then best=p;distance=d end end
  end end
  return best
end
local function stamp(im,x,y,rows,colors)
  for yy,row in ipairs(rows) do for xx=1,#row do local p=colors[row:sub(xx,xx)];if p then pixel(im,x+xx-1,y+yy-1,p) end end end
end
local function holding(source,girl)
  local body=clone(source)
  if girl then
    rect(body,10,63,12,6,clear);rect(body,12,69,8,3,clear);rect(body,9,72,10,4,clear);rect(body,9,76,8,2,clear)
    rect(body,43,63,11,6,clear);rect(body,46,69,6,3,clear);rect(body,48,72,7,6,clear)
  else
    rect(body,10,63,12,8,clear);rect(body,12,71,8,5,clear);rect(body,12,76,7,2,clear)
    rect(body,43,63,12,8,clear);rect(body,45,71,8,5,clear);rect(body,48,76,7,2,clear)
  end
  local arms=Image(64,96,ColorMode.RGB)
  for y=63,70 do for x=10,21 do local p=source:getPixel(x,y);if app.pixelColor.rgbaA(p)>0 then arms:drawPixel(x+4,y-5,p) end end end
  for y=63,70 do for x=43,54 do local p=source:getPixel(x,y);if app.pixelColor.rgbaA(p)>0 then arms:drawPixel(x-4,y-5,p) end end end
  local colors={
    O=sourceColor(source,{9,60,25,75},{20,15,11}),
    S=sourceColor(source,{9,60,25,75},{206,157,126}),
    K=sourceColor(source,{9,60,25,75},{242,198,160}),
    L=sourceColor(source,{9,60,25,75},{255,220,184}),
    W=sourceColor(source,{9,60,25,75},{247,231,204})
  }
  stamp(arms,19,58,{
    '....OO.',
    '...OKO.',
    '..OKLO.',
    '.OKLLOO',
    'OKLLKKO',
    'OKKKKSO',
    '.OSSSO.',
    '..OOO..'
  },colors)
  stamp(arms,39,58,{
    '.OO....',
    '.OKO...',
    '.OLKO..',
    'OOLLKKO',
    'OKKLLKO',
    'OSKKKKO',
    '.OSSSO.',
    '..OOO..'
  },colors)
  pixel(arms,22,62,colors.L);pixel(arms,42,62,colors.L)
  return body,arms
end
local function soot(source)
  local result=Image(64,96,ColorMode.RGB)
  for y=0,95 do for x=0,63 do
    local p=source:getPixel(x,y)
    if app.pixelColor.rgbaA(p)>0 then
      local luma=0.2126*app.pixelColor.rgbaR(p)+0.7152*app.pixelColor.rgbaG(p)+0.0722*app.pixelColor.rgbaB(p)
      local level=math.floor(28+luma*0.17)
      local color=Color{r=level,g=level+6,b=math.max(0,level-3),a=255}
      result:drawPixel(x,y,color.rgbaPixel)
    end
  end end
  return result
end
local function eyes(source,girl)
  local result=Image(64,96,ColorMode.RGB)
  local cream=Color{r=255,g=240,b=203}.rgbaPixel
  local dark=Color{r=24,g=31,b=23}.rgbaPixel
  local anchors=girl and {{23,44},{35,44}} or {{24,43},{38,43}}
  for _,p in ipairs(anchors) do
    for yy=p[2],p[2]+2 do for xx=p[1],p[1]+2 do if app.pixelColor.rgbaA(source:getPixel(xx,yy))>0 then result:drawPixel(xx,yy,cream) end end end
    result:drawPixel(p[1]+1,p[2]+1,dark)
  end
  local ash=Color{r=125,g=133,b=109}.rgbaPixel
  for _,p in ipairs({{19,17},{44,26},{14,38},{23,62},{39,70},{29,80}}) do if app.pixelColor.rgbaA(source:getPixel(p[1],p[2]))>0 then result:drawPixel(p[1],p[2],ash) end end
  return result
end
local function prone(charred,girl)
  local result=Image(64,96,ColorMode.RGB)
  local scale=0.6
  local raw=Image(58,39,ColorMode.RGB)
  for y=0,38 do for x=0,57 do
    local sx=math.floor((x+0.5)/scale);local sy=math.floor((y+0.5)/scale)
    local originalX=63-sy;local originalY=sx
    if originalX>=0 and originalX<64 and originalY>=0 and originalY<96 then raw:drawPixel(x,y,charred:getPixel(originalX,originalY)) end
  end end
  local bottom=0
  for y=0,38 do for x=0,57 do if app.pixelColor.rgbaA(raw:getPixel(x,y))>0 then bottom=math.max(bottom,y) end end end
  local offsetY=94-bottom
  for y=0,38 do for x=0,57 do pixel(result,x+3,y+offsetY,raw:getPixel(x,y)) end end
  local cream=Color{r=255,g=240,b=203}.rgbaPixel
  local eyeAnchors=girl and {{23,44},{35,44}} or {{24,43},{38,43}}
  for _,p in ipairs(eyeAnchors) do
    local cx=3+math.floor(p[2]*scale);local cy=offsetY+math.floor((63-p[1])*scale)
    for delta=-1,1 do pixel(result,cx+delta,cy+delta,cream);pixel(result,cx+delta,cy-delta,cream) end
  end
  return result
end
for _,name in ipairs({'male','female'}) do
  local source=Image{fromFile=approved..name..'-64x96.png'}
  assert(source.width==64 and source.height==96,'Approved source dimensions changed')
  local girl=name=='female'
  local holdBody,holdArms=holding(source,girl)
  local charred=soot(source);local comic=eyes(source,girl)
  local downSource=clone(charred);downSource:drawImage(comic)
  local down=prone(downSource,girl)
  local sprite=Sprite(64,96,ColorMode.RGB)
  local base=sprite.layers[1];base.name='Approved exact artwork and derived body'
  local arms=sprite:newLayer();arms.name='Local rearranged source cuffs and cupped hands'
  local effect=sprite:newLayer();effect.name='Soot eyes and ash accents'
  for f=2,6 do sprite:newEmptyFrame() end
  local bases={source,bob(source),holdBody,bob(holdBody),charred,down}
  for f=1,6 do
    sprite.frames[f].duration=f<5 and 0.45 or 0.9
    sprite:newCel(base,f,bases[f])
    if f==3 or f==4 then sprite:newCel(arms,f,holdArms) end
    if f==5 then sprite:newCel(effect,f,comic) end
  end
  for _,spec in ipairs({{'Idle',1,2},{'Hold',3,4},{'Charred',5,5},{'Down',6,6}}) do local tag=sprite:newTag(spec[2],spec[3]);tag.name=spec[1] end
  sprite:saveAs(folder..'characters-'..name..'.aseprite')
end
local layout={frame={width=64,height=96},anchors={leftHand={x=22,y=62},rightHand={x=42,y=62},vegetable={x=32,y=62},baseline=94},approvedSource='art/concepts/fidelity-study/{male,female}-64x96.png',idleFrameOne='Pixel-identical to approved source.',holdingWindows={{x=8,y=50,width=18,height=28},{x=39,y=50,width=18,height=28}},animations={Idle={from=0,to=1,durationMs=450,sheetWidth=128},Hold={from=2,to=3,durationMs=450,sheetWidth=128},Charred={from=4,to=4,durationMs=900,sheetWidth=64},Down={from=5,to=5,durationMs=900,sheetWidth=64}}}
local file=io.open(folder..'characters-layout.json','w');file:write(json.encode(layout));file:close()
