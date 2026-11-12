local root=app.params.root or app.fs.currentPath
local folder=root..'/hot-potato/art/concepts/fidelity-study/'
local source=Image{fromFile=root..'/hot-potato/art/concepts/character-options.png'}
local ox,oy,w,h=20,140,580,455
local function rgb(p) return app.pixelColor.rgbaR(p),app.pixelColor.rgbaG(p),app.pixelColor.rgbaB(p) end
local function isOlive(p)
  local r,g,b=rgb(p)
  local distance=(r-190)^2+(g-193)^2+(b-146)^2
  return distance<=36^2 or (r>90 and b>55 and g-r>=-7 and g-r<=16 and g-b>=25 and g-b<=72)
end
local pixels={}
for y=0,h-1 do for x=0,w-1 do pixels[y*w+x+1]=source:getPixel(ox+x,oy+y) end end
local background={}
local queue={}
local function addBg(i) if not background[i] and isOlive(pixels[i]) then background[i]=true;queue[#queue+1]=i end end
for x=0,w-1 do addBg(x+1);addBg((h-1)*w+x+1) end
for y=0,h-1 do addBg(y*w+1);addBg(y*w+w) end
local head=1
local function neighbours(i,fn)
  local x=(i-1)%w;local y=math.floor((i-1)/w)
  if x>0 then fn(i-1) end;if x<w-1 then fn(i+1) end;if y>0 then fn(i-w) end;if y<h-1 then fn(i+w) end
end
while head<=#queue do local i=queue[head];head=head+1;neighbours(i,addBg) end
local labels={}
local components={}
for i=1,w*h do
  if not background[i] and not labels[i] then
    local id=#components+1;local indices={i};labels[i]=id;local qhead=1
    while qhead<=#indices do
      local at=indices[qhead];qhead=qhead+1
      neighbours(at,function(n) if not background[n] and not labels[n] then labels[n]=id;indices[#indices+1]=n end end)
    end
    components[#components+1]={id=id,indices=indices,count=#indices}
  end
end
table.sort(components,function(a,b) return a.count>b.count end)
local figures={components[1],components[2]}
table.sort(figures,function(a,b) return a.indices[1]%w<b.indices[1]%w end)
local report={}
local commonWidth=0
for index,figure in ipairs(figures) do
  local name=index==1 and 'male' or 'female'
  local minx,maxx,miny,maxy=w,0,h,0
  for _,i in ipairs(figure.indices) do local x=(i-1)%w;local y=math.floor((i-1)/w);minx=math.min(minx,x);maxx=math.max(maxx,x);miny=math.min(miny,y);maxy=math.max(maxy,y) end
  figure.name=name;figure.left=minx-4;figure.width=maxx-minx+9
  commonWidth=math.max(commonWidth,figure.width)
  figure.original=Image(figure.width,h,ColorMode.RGB)
  figure.cutout=Image(figure.width,h,ColorMode.RGB)
  for y=0,h-1 do for x=0,figure.width-1 do figure.original:drawPixel(x,y,source:getPixel(ox+figure.left+x,oy+y)) end end
  for _,i in ipairs(figure.indices) do local x=(i-1)%w-figure.left;local y=math.floor((i-1)/w);figure.cutout:drawPixel(x,y,pixels[i]) end
  figure.original:saveAs(folder..name..'-approved-source-crop.png')
  figure.cutout:saveAs(folder..name..'-exact-cutout.png')
  local sprite=Sprite(figure.width,h,ColorMode.RGB)
  local original=sprite.layers[1];original.name='Approved A original crop';sprite:newCel(original,1,figure.original);original.isVisible=false
  local extracted=sprite:newLayer();extracted.name='Exact pixels after contiguous olive mask';sprite:newCel(extracted,1,figure.cutout)
  sprite:saveAs(folder..name..'-exact-cutout.aseprite')
  report[#report+1]={name=name,pixels=figure.count,sourceBounds={x=ox+minx,y=oy+miny,width=maxx-minx+1,height=maxy-miny+1},cropBounds={x=ox+figure.left,y=oy,width=figure.width,height=h}}
end
for _,size in ipairs({{32,48},{48,72},{64,96}}) do
  local tw,th=size[1],size[2];local scale=math.min(tw/commonWidth,th/h)
  for _,figure in ipairs(figures) do
    local result=Image(tw,th,ColorMode.RGB)
    local contentWidth=figure.width*scale
    local offset=(tw-contentWidth)/2
    for y=0,th-1 do for x=0,tw-1 do
      local sx=math.floor((x+0.5-offset)/scale);local sy=math.floor((y+0.5)/scale)
      if sx>=0 and sx<figure.width and sy>=0 and sy<h then result:drawPixel(x,y,figure.cutout:getPixel(sx,sy)) end
    end end
    local stem=figure.name..'-'..tw..'x'..th
    result:saveAs(folder..stem..'.png')
    local sprite=Sprite(tw,th,ColorMode.RGB);sprite.layers[1].name='Approved A exact nearest-neighbour pixels';sprite:newCel(sprite.layers[1],1,result);sprite:saveAs(folder..stem..'.aseprite')
  end
end
local metadata={source='art/concepts/character-options.png',method='Boundary-seeded four-connected olive background flood mask followed by two largest four-connected foreground components; all retained source RGBA values copied exactly.',backgroundReference={190,193,146},sourceArea={x=ox,y=oy,width=w,height=h},commonScale='Each canvas uses min(canvas width / largest padded source width, canvas height / 455). Both figures retain the shared source y=140 origin and source baseline. No independent height normalization.',figures=report,otherComponentsDiscarded=#components-2}
local file=io.open(folder..'extraction.json','w');file:write(json.encode(metadata));file:close()
print(json.encode(metadata))
