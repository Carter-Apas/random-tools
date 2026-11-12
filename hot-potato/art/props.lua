local output = app.params["output"] or "hot-potato/public/assets/"
local source = app.params["source"] or "hot-potato/art/"
local P = {
 ink="343b32", leaf="365e38", grass="68934b", green="8db65d", lime="aacb72",
 cream="fff3ce", gold="f7d77c", wood="9b6241", lightwood="cd9561", bark="654837",
 soil="b99a6a", sand="d8bd86", coral="df6550", red="b84543", blue="668cc4",
 orange="ef9943", orangeDark="c96e36", orangeLight="ffd172", purple="805178",
 purpleDark="573c5c", purpleLight="ae7191", yellow="f6cd56", darkgold="bc8b3b",
 white="fff8e6", black="343b32", smoke="a89c94"
}
local function c(v) local h=P[v] or v; return Color{r=tonumber(h:sub(1,2),16),g=tonumber(h:sub(3,4),16),b=tonumber(h:sub(5,6),16),a=255}.rgbaPixel end
local function px(im,x,y,color) if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,c(color)) end end
local function rect(im,x,y,w,h,col) for yy=y,y+h-1 do for xx=x,x+w-1 do px(im,xx,yy,col) end end end
local function ellipse(im,x,y,w,h,col) local cx=x+w/2; local cy=y+h/2; for yy=y,y+h-1 do for xx=x,x+w-1 do if ((xx+.5-cx)/(w/2))^2+((yy+.5-cy)/(h/2))^2<=1 then px(im,xx,yy,col) end end end end
local function line(im,x0,y0,x1,y1,col) local dx=math.abs(x1-x0); local sx=x0<x1 and 1 or -1;local dy=-math.abs(y1-y0);local sy=y0<y1 and 1 or -1; local err=dx+dy;while true do px(im,x0,y0,col);if x0==x1 and y0==y1 then break end;local e2=2*err;if e2>=dy then err=err+dy;x0=x0+sx end;if e2<=dx then err=err+dx;y0=y0+sy end end end
local function poly(im,points,col) local minx,miny,maxx,maxy=999,999,-999,-999; for _,v in ipairs(points) do minx=math.min(minx,v[1]);maxx=math.max(maxx,v[1]);miny=math.min(miny,v[2]);maxy=math.max(maxy,v[2]);end;for y=miny,maxy do for x=minx,maxx do local inside=false; local j=#points;for i=1,#points do local a,b=points[i],points[j];if ((a[2]>y+.5)~=(b[2]>y+.5)) and (x+.5<(b[1]-a[1])*(y+.5-a[2])/(b[2]-a[2])+a[1]) then inside=not inside end;j=i end;if inside then px(im,x,y,col) end end end end
local function face(im,x,y) rect(im,x,y,1,2,"ink");rect(im,x+5,y,1,2,"ink");px(im,x+2,y+3,"bark");px(im,x+3,y+3,"bark") end
local function leaf(im,x,y,flip) local d=flip and -1 or 1;poly(im,{{x,y},{x+5*d,y-5},{x+7*d,y-5},{x+6*d,y-1},{x+2*d,y+1}},"leaf");line(im,x,y,x+5*d,y-3,"green") end
local function save(im,name) local s=Sprite(im.width,im.height,ColorMode.RGB);s.cels[1].image=im;s.layers[1].name="Original pixels";s:saveAs(source.."props-"..name..".aseprite");s:saveAs(output..name..".png");s:close() end
local function image(w,h) return Image(w,h,ColorMode.RGB) end
local potato=image(24,24)
poly(potato,{{2,11},{4,8},{8,7},{14,6},{18,7},{21,9},{22,12},{21,15},{19,17},{13,18},{7,18},{3,16},{2,14}},"ink")
poly(potato,{{3,11},{5,9},{8,8},{14,7},{18,8},{20,10},{21,12},{20,15},{18,16},{13,17},{7,17},{4,15},{3,14}},"wood")
poly(potato,{{3,11},{5,9},{8,8},{14,7},{18,8},{20,10},{20,12},{18,14},{13,15},{7,15},{4,14}},"lightwood")
poly(potato,{{4,11},{6,9},{9,8},{14,8},{17,9},{18,10},{15,12},{9,13},{5,13}},"sand")
rect(potato,6,10,2,1,"cream");px(potato,17,9,"wood");px(potato,18,10,"bark");px(potato,5,14,"wood");px(potato,7,16,"bark");px(potato,18,14,"wood");px(potato,19,15,"bark");face(potato,10,11);save(potato,"potato")
local carrot=image(24,24)
poly(carrot,{{6,8},{15,6},{19,10},{16,15},{8,22},{6,22},{5,19},{5,12}},"ink");poly(carrot,{{7,9},{14,7},{18,10},{15,14},{7,21},{6,19},{6,13}},"orangeDark");poly(carrot,{{7,9},{14,7},{16,9},{14,13},{7,19},{6,18},{6,13}},"orange");line(carrot,8,10,12,8,"orangeLight");line(carrot,8,16,10,16,"orangeDark");line(carrot,13,12,15,12,"orangeDark");leaf(carrot,13,7,false);leaf(carrot,13,7,true);poly(carrot,{{12,6},{11,1},{13,0},{15,2},{14,7}},"leaf");rect(carrot,13,2,1,4,"green");face(carrot,8,11);save(carrot,"carrot")
local beet=image(24,24)
ellipse(beet,4,7,16,14,"ink");poly(beet,{{10,19},{15,19},{13,23},{11,23}},"ink");ellipse(beet,5,8,14,12,"purpleDark");ellipse(beet,5,8,13,10,"purple");ellipse(beet,6,8,9,6,"purpleLight");rect(beet,7,9,3,1,"cream");line(beet,12,19,12,22,"purple");leaf(beet,12,8,false);leaf(beet,12,8,true);poly(beet,{{11,7},{10,1},{13,0},{15,3},{13,8}},"leaf");line(beet,12,2,12,7,"grass");face(beet,9,12);save(beet,"beetroot")
local turnip=image(24,24)
ellipse(turnip,4,7,16,14,"ink");poly(turnip,{{10,18},{14,18},{13,23},{11,23}},"ink");ellipse(turnip,5,8,14,12,"sand");ellipse(turnip,5,8,13,10,"cream");ellipse(turnip,5,8,13,5,"purpleLight");ellipse(turnip,6,8,9,3,"purple");line(turnip,12,19,12,21,"sand");leaf(turnip,12,8,false);leaf(turnip,12,7,true);rect(turnip,11,2,2,6,"leaf");rect(turnip,12,1,3,3,"green");face(turnip,9,13);save(turnip,"turnip")
local pumpkin=image(24,24)
ellipse(pumpkin,2,6,20,16,"ink");ellipse(pumpkin,3,7,18,14,"orangeDark");ellipse(pumpkin,4,7,16,12,"orange");ellipse(pumpkin,8,7,8,13,"orangeDark");ellipse(pumpkin,9,7,6,12,"orange");line(pumpkin,5,11,6,9,"orangeLight");rect(pumpkin,10,8,2,2,"orangeLight");rect(pumpkin,11,2,3,5,"ink");rect(pumpkin,12,3,1,4,"wood");leaf(pumpkin,14,7,false);face(pumpkin,9,12);save(pumpkin,"pumpkin")
local corn=image(24,24)
ellipse(corn,6,1,12,21,"ink");ellipse(corn,7,2,10,19,"darkgold");ellipse(corn,7,2,9,17,"yellow");for y=4,15,3 do for x=9,14,3 do rect(corn,x,y,2,2,"gold") end end
poly(corn,{{3,10},{7,12},{10,17},{12,21},{12,23},{8,21},{5,17}},"leaf");poly(corn,{{21,9},{17,11},{14,17},{11,22},{12,23},{17,21},{20,16}},"leaf");line(corn,5,12,10,20,"green");line(corn,19,11,15,20,"grass");face(corn,9,9);save(corn,"corn")
local aubergine=image(24,24)
poly(aubergine,{{13,4},{18,5},{20,9},{19,16},{15,21},{9,23},{4,21},{3,18},{6,16},{10,13},{12,8}},"ink");poly(aubergine,{{14,6},{17,6},{19,9},{18,15},{14,20},{9,22},{5,20},{4,18},{7,17},{12,12}},"purpleDark");poly(aubergine,{{14,6},{17,7},{18,10},{16,15},{12,19},{7,20},{5,18},{8,16},{12,11}},"purple");line(aubergine,14,9,12,13,"purpleLight");line(aubergine,12,13,8,17,"purpleLight");poly(aubergine,{{12,6},{13,2},{16,2},{17,4},{20,6},{16,8},{15,6},{12,8}},"leaf");line(aubergine,15,2,16,0,"leaf");face(aubergine,10,13);save(aubergine,"aubergine")
local tomato=image(24,24)
ellipse(tomato,2,5,20,17,"ink");ellipse(tomato,3,6,18,15,"red");ellipse(tomato,3,6,17,12,"coral");ellipse(tomato,5,7,7,4,"f18c6b");rect(tomato,6,7,3,1,"cream");poly(tomato,{{12,8},{5,5},{10,5},{10,2},{13,4},{16,2},{15,5},{20,6},{15,7},{14,10}},"leaf");rect(tomato,12,1,2,4,"wood");face(tomato,9,12);save(tomato,"tomato")
local function fire(frame)
 local im=image(48,48)
 ellipse(im,4,35,40,11,"bark");ellipse(im,7,35,34,8,"wood");
 local stones={{5,36,8,5},{9,40,9,5},{19,41,10,5},{31,39,9,5},{37,35,7,5},{32,32,8,5},{10,32,8,5}}
 for _,p in ipairs(stones) do ellipse(im,p[1],p[2],p[3],p[4],"ink");ellipse(im,p[1]+1,p[2],p[3]-2,p[4]-2,"smoke");end
 poly(im,{{10,32},{14,28},{37,37},{34,41}},"ink");poly(im,{{12,32},{14,30},{35,37},{33,39}},"wood");line(im,14,31,32,37,"lightwood");poly(im,{{12,37},{34,28},{38,32},{16,41}},"ink");poly(im,{{14,37},{34,30},{36,32},{16,39}},"wood");line(im,17,37,34,31,"lightwood")
 local bend=({0,2,4,3,0,-3,-4,-2})[frame+1]
 local rise=({0,2,4,3,1,0,-1,0})[frame+1]
 local left=({0,-2,-3,-1,1,2,1,0})[frame+1]
 local right=({0,1,3,2,0,-2,-3,-1})[frame+1]
 poly(im,{{12,31},{11,24},{14+left,17+rise},{15,22},{19,15},{20+bend,7+rise},{25+bend,2+rise},{24+bend,12},{28,17},{31+right,12-rise},{32,22},{36,25},{36,31},{32,36},{19,37}},"ink")
 poly(im,{{14,30},{13,24},{15+left,20+rise},{16,24},{21,16},{22+bend,8+rise},{24+bend,6+rise},{23+bend,13},{27,20},{30+right,17-rise},{30,24},{34,26},{34,31},{30,35},{20,35}},"coral")
 poly(im,{{16,30},{17,25},{20+left,23},{23+bend,15+rise},{24,22},{28,25},{30+right,23-rise},{32,29},{30,33},{20,34}},"orange")
 poly(im,{{20,31},{21,26},{24+math.floor(bend/2),23+rise},{25,28},{28,29},{27,33},{22,33}},"gold")
 if frame==0 then
 rect(im,21,7,2,2,"orange");rect(im,30,4,1,2,"gold")
 else
 local sparks={
 {{18,10},{30,6},{35,15}},{{16,7},{31,3},{36,12}},{{15,4},{32,0},{38,9}},
 {{17,1},{33,6},{36,4}},{{16,9},{30,2},{34,12}},{{14,6},{29,0},{35,9}},{{17,3},{28,7},{33,6}}
 }
 for i,point in ipairs(sparks[frame]) do rect(im,point[1],point[2],i==1 and 2 or 1,i==3 and 1 or 2,i==2 and "gold" or "orange") end
 local embers={{{17,36},{29,36}},{{19,37},{31,35}},{{15,36},{27,38}},{{18,38},{30,36}},{{16,37},{28,36}},{{19,36},{32,36}},{{17,38},{29,37}}}
 for _,point in ipairs(embers[frame]) do rect(im,point[1],point[2],2,1,"coral");px(im,point[1],point[2],"gold") end
 end
 return im
end
local function saveAnimation(name,frames,ms)
 local w,h=frames[1].width,frames[1].height
 local s=Sprite(w,h,ColorMode.RGB);s.layers[1].name=name.." original pixels";s.cels[1].image=frames[1];s.frames[1].duration=ms/1000
 local sheet=image(w*#frames,h);sheet:drawImage(frames[1],Point(0,0))
 for i=2,#frames do local f=s:newEmptyFrame();f.duration=ms/1000;s:newCel(s.layers[1],f,frames[i]);sheet:drawImage(frames[i],Point((i-1)*w,0)) end
 local tag=s:newTag(1,#frames);tag.name=name;tag.aniDir=AniDir.FORWARD
 s:saveAs(source.."props-"..name..".aseprite");s:close()
 local exported=Sprite(w*#frames,h,ColorMode.RGB);exported.cels[1].image=sheet;exported:saveAs(output..name..".png");exported:close()
end
local fires={};for i=0,7 do fires[i+1]=fire(i) end;saveAnimation("fire",fires,100)
local still=Sprite(48,48,ColorMode.RGB);still.cels[1].image=fires[1];still:saveAs(output.."fire-still.png");still:close()
local function handFlame(im,x,y,frame,big)
 local sway=({-1,0,1,0})[frame+1]
 local height=({0,2,1,-1})[frame+1]
 local width=big and 4 or 3
 local rise=big and 9 or 6
 poly(im,{{x-width,y+2},{x-width-1,y-2},{x-2+sway,y-5-height},{x+sway,y-rise-height},{x+1+sway,y-4},{x+3,y-6+height},{x+width,y-1},{x+width-1,y+2}},"coral")
 poly(im,{{x-width+1,y+1},{x-2,y-2},{x+sway,y-rise+3-height},{x+1,y-2},{x+2,y-3},{x+width-1,y},{x+width-2,y+2}},"orange")
 poly(im,{{x-1,y+1},{x-1,y-2},{x+sway,y-4},{x+1,y-1},{x+2,y+1}},"gold")
end
local function heatWarm(frame)
 local im=image(32,40)
 for _,x in ipairs({10,22}) do
 rect(im,x-2,24,4,3,"red");rect(im,x-1,24,3,2,"coral");px(im,x,24,"orangeLight")
 local sway=({-1,0,1,0})[frame+1]
 local rise=({0,1,2,3})[frame+1]
 line(im,x+sway,21-rise,x-1+sway,20-rise,"ce9275")
 line(im,x-1+sway,19-rise,x+sway,18-rise,"f3c799")
 end
 return im
end
local function heatHands(frame)
 local im=image(32,40)
 handFlame(im,10,25,frame,false);handFlame(im,22,25,(frame+2)%4,false)
 local sparkX=({7,8,10,9})[frame+1]
 local sparkY=({16,14,12,18})[frame+1]
 px(im,sparkX,sparkY,"gold");px(im,31-sparkX,sparkY+1,"orange")
 return im
end
local function heatBody(frame)
 local im=image(32,40)
 local sway=({-1,1,2,0})[frame+1]
 local rise=({0,2,1,-1})[frame+1]
 poly(im,{{5,34},{2,29},{3,22},{4,25},{3+sway,15},{6+sway,7+rise},{7,16},{9,20},{8,28},{12,32},{16,34},{22,30},{23,22},{25,17},{24+sway,10-rise},{27+sway,3+rise},{28,13},{30,20},{28,24},{30,28},{27,35},{21,38},{9,38}},"coral")
 poly(im,{{6,33},{4,28},{5,23},{6,26},{5+sway,17},{7,12+rise},{8,22},{10,28},{14,33},{18,34},{24,29},{25,23},{27,19},{26+sway,12},{28,8+rise},{28,18},{29,21},{27,25},{28,29},{25,34},{21,36},{10,36}},"orange")
 poly(im,{{8,34},{7,30},{8,27},{10,31},{12,33},{15,32},{17,28+rise},{19,32},{23,30},{25,26},{25,32},{22,35},{12,36}},"gold")
 handFlame(im,10,25,frame,true);handFlame(im,22,25,(frame+2)%4,true)
 poly(im,{{12,32},{13,26},{15+sway,20+rise},{16,25},{19,28},{20,33},{17,36}},"coral")
 poly(im,{{14,33},{14,28},{16,24+rise},{17,29},{19,32},{17,35}},"orange")
 poly(im,{{15,33},{16,29},{17,33},{16,35}},"gold")
 local sparkY=({4,2,0,6})[frame+1]
 rect(im,7+sway,sparkY,1,2,"orange");px(im,25-sway,sparkY+4,"gold")
 return im
end
for _,effect in ipairs({{"heat-warm",heatWarm},{"heat-hands",heatHands},{"heat-body",heatBody}}) do
 local frames={};for i=0,3 do frames[i+1]=effect[2](i) end;saveAnimation(effect[1],frames,100)
end
for _,empty in ipairs({false,true}) do local im=image(12,12);poly(im,{{0,3},{1,1},{4,1},{6,3},{8,1},{11,1},{12,3},{12,6},{6,12},{0,6}},"ink");poly(im,{{1,3},{2,2},{4,2},{6,4},{8,2},{10,2},{11,3},{11,6},{6,10},{1,6}},empty and "b99a6a" or "red");if not empty then poly(im,{{1,3},{2,2},{4,2},{6,4},{8,2},{10,2},{10,5},{5,9},{1,5}},"coral");rect(im,2,3,2,1,"cream") end;save(im,empty and "heart-empty" or "heart") end
local crown=image(24,24)
poly(crown,{{2,5},{8,9},{12,2},{16,9},{22,5},{20,20},{4,20}},"ink");poly(crown,{{3,7},{8,11},{12,4},{16,11},{21,7},{19,18},{5,18}},"darkgold");poly(crown,{{4,8},{8,12},{12,6},{16,12},{20,8},{18,17},{6,17}},"yellow");rect(crown,5,17,14,2,"orange");rect(crown,6,17,12,1,"gold");rect(crown,11,12,2,3,"coral");rect(crown,7,13,1,2,"cream");rect(crown,17,13,1,2,"cream");save(crown,"crown")
for _,kind in ipairs({"wood","green"}) do
 local im=image(48,24);local dark=kind=="wood" and "wood" or "leaf";local base=kind=="wood" and "lightwood" or "grass";local light=kind=="wood" and "sand" or "lime"
 rect(im,3,0,42,24,"ink");rect(im,0,3,48,18,"ink");rect(im,2,3,44,17,dark);rect(im,4,2,40,19,dark);rect(im,3,3,42,16,base);rect(im,5,2,38,18,base);rect(im,4,3,40,2,light);rect(im,3,5,2,12,light);rect(im,44,5,1,13,dark);rect(im,5,19,38,2,dark)
 px(im,5,6,dark);px(im,42,6,dark);px(im,5,17,dark);px(im,42,17,dark)
 save(im,"button-"..kind)
end
