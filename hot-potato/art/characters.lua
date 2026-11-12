local root = app.params.root or app.fs.currentPath
local sources = root .. '/hot-potato/art/'
local palette = {
  outline='#343b32', hair='#654837', hairshade='#4b3b32', hairlight='#9b6644', hairshine='#bc8550',
  skin='#f3c799', skinlight='#ffdab0', skinshadow='#ce9275', blush='#e6a18b',
  cream='#fff3ce', creamshade='#d5cba0', cap='#b65742', capshade='#813f35', caplight='#df8060',
  navy='#41566e', navyshade='#303f54', navylight='#617b92', green='#46724b', greenshade='#36533b',
  greenlight='#75985c', coral='#df6550', coralshade='#a9473f', corallight='#ee8a66',
  pack='#bd955c', packlight='#dec087', packshade='#866643', shoe='#654837', shoelight='#9b6241',
  shadow='#365e3845', shadowdeep='#365e3830', soot='#3a3d38', ash='#61635a', ashlight='#929584'
}
local colors = {}
for name,hex in pairs(palette) do
  colors[name]=Color{r=tonumber(hex:sub(2,3),16),g=tonumber(hex:sub(4,5),16),b=tonumber(hex:sub(6,7),16),a=#hex>7 and tonumber(hex:sub(8,9),16) or 255}
end
local function dot(im,x,y,c) im:drawPixel(x,y,colors[c]) end
local function rect(im,x,y,w,h,c)
  for yy=y,y+h-1 do for xx=x,x+w-1 do dot(im,xx,yy,c) end end
end
local function shape(im,x,y,rows,map)
  for yy,row in ipairs(rows) do for xx=1,#row do local color=map[row:sub(xx,xx)]; if color then dot(im,x+xx-1,y+yy-1,color) end end end
end
local function shadow(im)
  rect(im,9,37,14,2,'shadow');rect(im,7,38,18,1,'shadow');rect(im,11,38,10,1,'shadowdeep')
end
local function rear(im,girl,dy)
  shape(im,8,22,{
    '..OOOOOOOOOOOO..',
    '.OPPLPPPPPLPPPO.',
    'OPPLPPPPPPPLPPPO',
    'OPPLPPPPPPPLPPPO',
    'OPDPPPPPPPPPPDPO',
    'OPDDPPPPPPPPDDPO',
    '.ODDPPPPPPPPDDO.',
    '..OOOOOOOOOOOO..'
  },{O='outline',P='pack',L='packlight',D='packshade'})
  if girl then
    shape(im,6,11+dy,{
      '..OOOOOOOOOOOOOOOO..',
      '.OHHHHHHHHHHHHHHHHO.',
      'OHHHHHHHHHHHHHHHHHHO',
      'OHLLLLHHHHHHHHHLLHHO',
      'OHLLLLHHHHHHHHHLLHHO',
      'OHLLLLHHHHHHHHHLLHHO',
      'OHLLLH..........LHHO',
      '.HLLLH..........LHHO',
      '.HLLLH..........LHHO',
      '.HLLLH..........LHHO',
      '.HLLLH..........LHHO',
      '.HLLLH..........LHHO',
      '.HLLHH..........LHHO',
      '..HHH...........LHHO',
      '................LHH.',
      '.................H..'
    },{O='outline',H='hairshade',L='hairlight'})
  end
end
local function legs(im,girl)
  shape(im,10,30,{
    'OOOOOOOOOOOO',
    'OLLLLLLLLLDO',
    'OLLLLOOLLLDO',
    'OSSSO..OSSSO',
    'OKKSO..OSKKO',
    'OKKSO..OSKKO',
    'OCCCO..OCCCO',
    'ODDDO..ODDDO',
    '.OOO....OOO.'
  },{O='outline',L=girl and 'coral' or 'navyshade',D=girl and 'coralshade' or 'navyshade',S='skinshadow',K='skin',C='shoe'})
  rect(im,11,36,2,1,'shoelight');rect(im,18,36,2,1,'shoelight')
end
local function body(im,girl,dy,hold)
  local base=girl and 'green' or 'navy';local light=girl and 'greenlight' or 'navylight';local dark=girl and 'greenshade' or 'navyshade'
  shape(im,8,22+dy,{
    '....OOOOOOOO....',
    '..OOSWWWWSSOO...',
    '.OSSLWWWWLSSSO..',
    '.OSSLWWWWLSSSO..',
    '.OSSLWWWWLSSSO..',
    '..OSLWWWWLSSO...',
    '..OSLWWWWLSSO...',
    '..OSLWWWWLSSO...',
    '...ODDDDDDDO....',
    '....OOOOOOO.....'
  },{O='outline',S=base,L=light,W=girl and base or 'cream',D=dark})
  rect(im,11,24+dy,1,5,'packlight');rect(im,20,24+dy,1,5,'packshade')
  rect(im,12,24+dy,1,3,'packshade');rect(im,19,24+dy,1,3,'packlight')
  if girl then
    dot(im,14,23+dy,'cream');dot(im,17,23+dy,'cream');rect(im,15,24+dy,2,1,'creamshade')
    rect(im,15,28+dy,3,1,'greenshade');dot(im,16,27+dy,'greenlight')
  else
    rect(im,15,25+dy,1,5,'creamshade');dot(im,17,28+dy,'navyshade')
  end
  if hold then
    shape(im,7,24,{'..OOO','OOKKO','OKKKO','.OSSO','..OO.'},{O='outline',K='skinlight',S='skinshadow'})
    shape(im,20,24,{'OOO..','OKKOO','OKKKO','OSSO.','.OO..'},{O='outline',K='skinlight',S='skinshadow'})
    dot(im,10,24,'skinlight');dot(im,22,24,'skinlight')
    if dy==1 then dot(im,9,26,'skin');dot(im,23,26,'skin') end
  else
    shape(im,8,25+dy,{'OSS','OSS','OKK','OKK','.OO'},{O='outline',S=base,K='skin'})
    shape(im,21,25+dy,{'SSO','SSO','KKO','KKO','OO.'},{O='outline',S=base,K='skin'})
    dot(im,9,27+dy,'skinlight');dot(im,22,27+dy,'skinlight')
  end
end
local function head(im,girl,dy)
  shape(im,7,8+dy,{
    '.....OOOOOOOO.....',
    '...OOHHHHHHHHOO...',
    '..OHHHHHHHHHHHHO..',
    '.OHHHHHHHHHHHHHHO.',
    '.OHHHHHHHHHHHHHHO.',
    'OHHHHHHHHHHHHHHHHO',
    'OHHKKKKKKKKKKKKHHO',
    'OHKKKKKKKKKKKKKKHO',
    'OHKKKKKKKKKKKKKKHO',
    'OHKKKKKKKKKKKKKKHO',
    '.OKKKKKKKKKKKKKKO.',
    '..OKKKKKKKKKKKKO..',
    '...OKKKKKKKKKKO...',
    '....OSSSSSSSSO....',
    '.....OOOOOOOO.....'
  },{O='outline',H='hairshade',K='skin',S='skinshadow'})
  rect(im,11,15+dy,10,1,'skinlight')
  rect(im,12,17+dy,1,2,'outline');rect(im,19,17+dy,1,2,'outline')
  dot(im,15,19+dy,'skinshadow');dot(im,16,20+dy,'hairlight')
  dot(im,10,19+dy,'blush');dot(im,21,19+dy,'blush')
  if girl then
    shape(im,7,5+dy,{
      '......OOOOOO......',
      '....OOHHHHHHOO....',
      '...OHLLLLLLLLHO...',
      '..OHLLLLLLLLLLHO..',
      '.OHLLLLLLLLLLLLHO.',
      '.OCCCCCCCCCCCCCCO.',
      'OCCWWWWWWWWWWWWCCO',
      'OCCCCCCCCCCCCCCCCO',
      'OHLLLLLLLLLLLLLHHO',
      'OHLLLLLLLLLLLLLHHO',
      'OHLLLHLLLLLLLLHHHO',
      '.OHHH.LLLLHHH.HHO.',
      '..OH...HHHH...HO..'
    },{O='outline',H='hair',L='hairlight',C='creamshade',W='cream'})
    rect(im,11,7+dy,4,1,'hairshine');rect(im,19,8+dy,2,1,'hairshine')
    shape(im,24,10+dy,{'OO.','OCW','OCW','OCO','.OO'},{O='outline',C='creamshade',W='cream'})
  else
    shape(im,7,5+dy,{
      '......OOOOOO......',
      '....OORRRRRROO....',
      '...ORLLLLLLLLRO...',
      '..ORLLLLLLLLLLRO..',
      '.ORLLLLLLLLLLLLRO.',
      '.ORLLLLLLLLLLLLRO.',
      'ORRLLLLLLLLLLLLRRO',
      'ORRRLLLLLLLLLLRRRO',
      '.ORRRRRRRRRRRRRRO.',
      '..ODDDDDDDDDDDDO..',
      '...OOOOOOOOOOOO...'
    },{O='outline',R='cap',L='caplight',D='capshade'})
    rect(im,13,7+dy,1,4,'cap');rect(im,16,8+dy,3,3,'creamshade')
    dot(im,17,8+dy,'cream');dot(im,17,9+dy,'green');dot(im,16,10+dy,'green')
    rect(im,10,14+dy,3,1,'caplight');rect(im,19,14+dy,3,1,'cap')
  end
end
local function char(im,layer,girl,state,frame)
  local dy=frame==2 and 1 or 0
  if layer==1 then shadow(im) elseif layer==2 then rear(im,girl,dy) elseif layer==3 then legs(im,girl) elseif layer==4 then body(im,girl,dy,state=='hold') else head(im,girl,dy) end
end
local function soot(im)
  for it in im:pixels() do
    local p=it();local a=app.pixelColor.rgbaA(p)
    if a==255 then
      local r=app.pixelColor.rgbaR(p);local g=app.pixelColor.rgbaG(p);local b=app.pixelColor.rgbaB(p)
      local c=(r+g+b)>470 and 'ash' or 'soot'
      it(colors[c].rgbaPixel)
    end
  end
end
local function upright(im,layer,girl)
  char(im,layer,girl,'idle',1);if layer>1 then soot(im) end
  if layer==5 then
    rect(im,12,17,2,2,'cream');rect(im,19,17,2,2,'cream')
    dot(im,13,18,'soot');dot(im,19,18,'soot');rect(im,15,20,2,1,'soot')
    dot(im,9,11,'ashlight');dot(im,14,8,'ashlight');dot(im,22,13,'ashlight')
    dot(im,7,8,'ash');dot(im,24,5,'ash');dot(im,11,2,'ashlight')
  elseif layer==4 then
    dot(im,12,27,'ashlight');dot(im,20,26,'ashlight');dot(im,15,30,'ashlight')
  end
end
local function down(im,layer,girl)
  if layer==1 then rect(im,5,37,23,2,'shadow');rect(im,9,38,16,1,'shadowdeep')
  elseif layer==2 then
    shape(im,13,30,{'..OOOOOOOOOO..','.OAAAAAAAAAAO.','OAAASSSSSSAAAO','OSSSSSSSSSSSSO','.OOOOOOOOOOOO.'},{O='outline',A='ash',S='soot'})
  elseif layer==3 then
    shape(im,21,32,{'OOOOOOO.','OASSSSAO','OASSSSAO','OOOSSSSO','..OOOOO.'},{O='outline',A='ash',S='soot'})
  elseif layer==4 then
    shape(im,14,31,{'..OOOOOOO..','.OSASSSSSO.','OSSSSASSSSO','OSSSSSSSSSO','.OASSSASSO.','..OOOOOOO..'},{O='outline',A='ash',S='soot'})
    rect(im,18,36,4,1,'ash');dot(im,19,35,'ashlight')
  else
    shape(im,4,25,{
      '......OOOOOO....',
      '....OOAAAAAAOO..',
      '...OAAAAAAAAAAO.',
      '..OAAAASSSSAAAAO',
      '.OAAAASSSSSSAAAO',
      'OAAASSSSSSSSSSAO',
      'OAASSSSSSSSSSSSO',
      'OASSSSSSSSSSSSSO',
      '.OSSSSSSSSSSSSO.',
      '..OSSSSSSSSSSO..',
      '...OASSSSSSAO...',
      '....OOOOOOOO....'
    },{O='outline',A='ash',S='soot'})
    dot(im,10,32,'cream');dot(im,11,33,'cream');dot(im,10,34,'cream');dot(im,14,32,'cream');dot(im,15,33,'cream');dot(im,14,34,'cream')
    dot(im,7,28,'ashlight');dot(im,13,27,'ashlight')
    if girl then rect(im,6,29,2,3,'ashlight');dot(im,18,29,'ash') else rect(im,6,30,9,1,'soot') end
    dot(im,3,35,'ash');dot(im,27,37,'ash');dot(im,6,23,'ash')
  end
end
for _,name in ipairs({'male','female'}) do
  local sprite=Sprite(32,40,ColorMode.RGB)
  local first=sprite.layers[1];first.name='Ground shadow'
  local layers={first}
  for _,title in ipairs({'Backpack and rear hair','Shorts legs and boots','Jacket top and hands','Face hair and headwear'}) do local layer=sprite:newLayer();layer.name=title;table.insert(layers,layer) end
  for i=2,6 do sprite:newEmptyFrame() end
  for f=1,6 do
    sprite.frames[f].duration=f<5 and 0.45 or 0.9
    for i,layer in ipairs(layers) do
      local im=Image(32,40,ColorMode.RGB)
      if f<=4 then char(im,i,name=='female',f<3 and 'idle' or 'hold',f%2==0 and 2 or 1) elseif f==5 then upright(im,i,name=='female') else down(im,i,name=='female') end
      sprite:newCel(layer,f,im,Point(0,0))
    end
  end
  for _,spec in ipairs({{'Idle',1,2},{'Hold',3,4},{'Charred',5,5},{'Down',6,6}}) do local tag=sprite:newTag(spec[2],spec[3]);tag.name=spec[1] end
  sprite:saveAs(sources..'characters-'..name..'.aseprite')
end
