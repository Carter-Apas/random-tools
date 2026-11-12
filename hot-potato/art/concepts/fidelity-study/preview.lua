local root=app.params.root or app.fs.currentPath
local folder=root..'/hot-potato/art/concepts/fidelity-study/'
local glyphs={
 A={'01110','10001','10001','11111','10001','10001','10001'},B={'11110','10001','10001','11110','10001','10001','11110'},C={'01111','10000','10000','10000','10000','10000','01111'},D={'11110','10001','10001','10001','10001','10001','11110'},E={'11111','10000','10000','11110','10000','10000','11111'},F={'11111','10000','10000','11110','10000','10000','10000'},G={'01111','10000','10000','10111','10001','10001','01110'},H={'10001','10001','10001','11111','10001','10001','10001'},I={'11111','00100','00100','00100','00100','00100','11111'},J={'00111','00010','00010','00010','00010','10010','01100'},K={'10001','10010','10100','11000','10100','10010','10001'},L={'10000','10000','10000','10000','10000','10000','11111'},M={'10001','11011','10101','10101','10001','10001','10001'},N={'10001','11001','10101','10011','10001','10001','10001'},O={'01110','10001','10001','10001','10001','10001','01110'},P={'11110','10001','10001','11110','10000','10000','10000'},R={'11110','10001','10001','11110','10100','10010','10001'},S={'01111','10000','10000','01110','00001','00001','11110'},T={'11111','00100','00100','00100','00100','00100','00100'},U={'10001','10001','10001','10001','10001','10001','01110'},V={'10001','10001','10001','10001','10001','01010','00100'},W={'10001','10001','10001','10101','10101','11011','10001'},X={'10001','10001','01010','00100','01010','10001','10001'},Y={'10001','10001','01010','00100','00100','00100','00100'},Z={'11111','00001','00010','00100','01000','10000','11111'},
 ['0']={'01110','10001','10011','10101','11001','10001','01110'},['1']={'00100','01100','00100','00100','00100','00100','01110'},['2']={'01110','10001','00001','00010','00100','01000','11111'},['3']={'11110','00001','00001','01110','00001','00001','11110'},['4']={'00010','00110','01010','10010','11111','00010','00010'},['5']={'11111','10000','10000','11110','00001','00001','11110'},['6']={'01110','10000','10000','11110','10001','10001','01110'},['7']={'11111','00001','00010','00100','01000','01000','01000'},['8']={'01110','10001','10001','01110','10001','10001','01110'},['9']={'01110','10001','10001','01111','00001','00001','01110'},['.']={'0','0','0','0','0','1','1'},['-']={'0','0','0','11111','0','0','0'}
}
local ink=Color{r=44,g=55,b=43}.rgbaPixel
local page=Color{r=245,g=245,b=237}.rgbaPixel
local pale=Color{r=232,g=236,b=225}.rgbaPixel
local checker=Color{r=211,g=221,b=207}.rgbaPixel
local frame=Color{r=147,g=161,b=139}.rgbaPixel
local image=Image(1120,680,ColorMode.RGB)
for it in image:pixels() do it(page) end
local function rect(x,y,w,h,color) for yy=y,y+h-1 do for xx=x,x+w-1 do image:drawPixel(xx,yy,color) end end end
local function text(x,y,value,scale)
  for i=1,#value do local glyph=glyphs[value:sub(i,i)];if glyph then for yy,row in ipairs(glyph) do for xx=1,#row do if row:sub(xx,xx)=='1' then rect(x+(i-1)*6*scale+(xx-1)*scale,y+(yy-1)*scale,scale,scale,ink) end end end end end
end
local function place(input,x,y,scale,alpha)
  local sw,sh=input.width,input.height;local dw,dh=math.floor(sw*scale+0.5),math.floor(sh*scale+0.5)
  rect(x-1,y-1,dw+2,dh+2,frame)
  for yy=0,dh-1 do for xx=0,dw-1 do
    local p=input:getPixel(math.min(sw-1,math.floor((xx+0.5)/scale)),math.min(sh-1,math.floor((yy+0.5)/scale)))
    if app.pixelColor.rgbaA(p)==0 then p=(math.floor(xx/8)+math.floor(yy/8))%2==0 and pale or checker end
    image:drawPixel(x+xx,y+yy,p)
  end end
end
text(20,16,'APPROVED A - EXACT SOURCE PIXELS',2)
text(20,40,'PREVIEW ONLY. NO REDRAWING OR PRODUCTION ASSET CHANGES.',1)
local columns={{x=20,w=152,label='SOURCE',sub='0.5X'},{x=180,w=152,label='CUTOUT',sub='0.5X'},{x=350,w=78,label='32X48',sub='1X'},{x=438,w=88,label='32X48',sub='2X'},{x=538,w=90,label='48X72',sub='1X'},{x=640,w=114,label='48X72',sub='2X'},{x=766,w=110,label='64X96',sub='1X'},{x=890,w=156,label='64X96',sub='2X'}}
for _,column in ipairs(columns) do text(column.x,64,column.label,2);text(column.x,83,column.sub,1) end
for row,name in ipairs({'male','female'}) do
  local bottom=row==1 and 346 or 630
  text(20,bottom-247,name:upper(),1)
  place(Image{fromFile=folder..name..'-approved-source-crop.png'},columns[1].x,bottom-228,0.5)
  place(Image{fromFile=folder..name..'-exact-cutout.png'},columns[2].x,bottom-228,0.5)
  local ci=3
  for _,size in ipairs({{32,48},{48,72},{64,96}}) do
    local input=Image{fromFile=folder..name..'-'..size[1]..'x'..size[2]..'.png'}
    for scale=1,2 do local column=columns[ci];place(input,column.x,bottom-size[2]*scale,scale);ci=ci+1 end
  end
end
text(20,650,'BOTH FIGURES USE THE SAME SOURCE SCALE AND BASELINE. NO HEIGHT NORMALIZATION.',1)
local sprite=Sprite(image.width,image.height,ColorMode.RGB);sprite.layers[1].name='Approved crops and exact nearest-neighbour size comparison';sprite:newCel(sprite.layers[1],1,image)
sprite:saveAs(folder..'comparison.aseprite');sprite:saveAs(folder..'comparison.png')
