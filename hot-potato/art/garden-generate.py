from pathlib import Path
from PIL import Image, ImageDraw
import random

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'public' / 'assets'
W, H = 320, 200
R = random.Random(716)
C = {'outline':'#343b32','leaf0':'#365e38','leaf1':'#4e7a40','grass0':'#68934b','grass':'#8db65d','grass1':'#aacb72','cream':'#fff3ce','yellow':'#f7d77c','wood0':'#765338','wood':'#9b6241','wood1':'#cd9561','soil':'#b99a6a','sand':'#d8bd86','sand1':'#e5cd99','coral':'#df6550','blue':'#668cc4'}
layers = []

def layer(name):
    im = Image.new('RGBA',(W,H))
    layers.append((name,im))
    return ImageDraw.Draw(im)

def rect(box,color):
    d.rectangle(box,fill=C.get(color,color))

def poly(points,color):
    d.polygon(points,fill=C.get(color,color))

def inside(x,y,extra=0):
    return ((x-160)/(105+extra))**2+((y-108)/(66+extra))**2<1

def grass(x,y,color='grass0'):
    d.line([(x-2,y),(x-2,y-2),(x,y),(x+1,y-3),(x+2,y)],fill=C[color])

d=layer('Meadow')
rect((0,0,W,H),'grass')
for y in range(0,H,8):
    for x in range(0,W,8):
        if R.random()<.32:
            rect((x,y,x+7,y+7),'#89b25a')
for _ in range(1000):
    x,y=R.randrange(W),R.randrange(H)
    if not inside(x,y,4):
        if R.random()<.35:
            grass(x,y,R.choice(['grass0','grass1']))
        else:
            rect((x,y,x+R.choice([1,2]),y),R.choice(['grass0','grass1']))

d=layer('Gathering clearing')
d.ellipse((52,39,268,177),fill=C['grass0'])
d.ellipse((54,39,266,173),fill='#9ca65c')
d.ellipse((56,42,264,172),fill=C['soil'])
d.ellipse((57,42,263,169),fill=C['sand'])
for _ in range(165):
    x,y=R.randrange(58,263),R.randrange(44,169)
    if inside(x,y,-5):
        rect((x,y,x+R.choice([0,1,2]),y),R.choice(['#cbb07d','#e1c994','#d3b783']))
for _ in range(44):
    import math
    angle=R.random()*math.tau
    x=int(160+108*math.cos(angle)); y=int(107+67*math.sin(angle))
    if y>48:
        grass(x,y,'grass0')


d=layer('Fence and stepping stones')
rect((0,36,138,37),'grass0'); rect((181,36,319,37),'grass0')
for x0,x1 in [(0,139),(181,319)]:
    rect((x0,25,x1,29),'wood0'); rect((x0,25,x1,26),'wood1'); rect((x0,32,x1,35),'wood0'); rect((x0,32,x1,33),'wood1')
    for x in range(x0+3,x1,14):
        poly([(x,36),(x,21),(x+3,18),(x+6,21),(x+6,36)],'wood0')
        poly([(x+1,34),(x+1,21),(x+3,19),(x+5,21),(x+5,34)],'wood1')
        rect((x+1,27,x+5,28),'wood'); rect((x+2,23,x+3,24),'cream')
for x in [138,178]:
    rect((x,18,x+5,39),'wood0'); rect((x,19,x+4,36),'wood1'); rect((x-1,17,x+6,20),'wood0'); rect((x,17,x+5,18),'yellow')
for x,y,width in [(155,29,10),(159,36,11),(150,42,12)]:
    poly([(x,y),(x+width-3,y-1),(x+width,y+2),(x+width-1,y+5),(x+1,y+5),(x-1,y+3)],'#8d967b')
    poly([(x,y),(x+width-3,y-1),(x+width,y+2),(x+width-2,y+3),(x+1,y+3),(x-1,y+2)],'#d0cbb1')
    rect((x+1,y,x+5,y),'cream')

d=layer('Trees and hedges')

def canopy(x,y,s=1):
    def P(points,c):
        poly([(x+int(a*s),y+int(b*s)) for a,b in points],c)
    P([(-12,14),(-12,18),(-8,22),(9,22),(15,17),(15,12)],'grass0')
    P([(-3,10),(-3,23),(4,23),(4,9)],'wood0')
    P([(-1,11),(-1,21),(2,21),(2,10)],'wood1')
    P([(-13,11),(-16,7),(-16,-2),(-13,-5),(-13,-11),(-7,-11),(-4,-15),(5,-15),(8,-11),(13,-10),(13,-5),(17,-1),(17,8),(13,12),(7,14),(-7,14)],'leaf0')
    P([(-12,7),(-14,3),(-14,-2),(-10,-5),(-10,-9),(-5,-9),(-2,-13),(4,-13),(8,-8),(11,-8),(12,-3),(15,0),(14,7),(10,10),(3,11),(-5,10)],'leaf1')
    P([(-10,-2),(-8,-6),(-4,-6),(-1,-11),(4,-10),(6,-6),(10,-4),(9,1),(5,4),(1,3),(-2,6),(-7,4)],'grass0')
    P([(-8,-3),(-4,-4),(-2,-8),(2,-8),(2,-6),(6,-5),(5,-2),(2,-2),(0,0),(-5,0)],'grass')
    P([(-11,3),(-9,3),(-9,5),(-6,6),(-6,8),(-10,7)],'#7a9d52')
    P([(7,5),(10,3),(11,4),(10,7),(7,8),(5,7)],'grass0')
    P([(-2,9),(1,7),(4,8),(3,10)],'#83a653')

for x,y,s in [(7,0,1.1),(38,0,1.1),(75,0,1.1),(107,0,1.05),(208,0,1.1),(242,0,1.1),(277,0,1.1),(313,0,1.1),(-4,59,1.2),(11,91,1.05),(4,123,1.2),(314,59,1.15),(309,92,1.1),(319,124,1.2)]:
    canopy(x,y,s)


def hedge(x,y,w):
    rect((x+2,y+3,x+w-2,y+14),'grass0')
    poly([(x,y+8),(x-2,y+5),(x,y),(x+4,y-3),(x+w-4,y-3),(x+w,y),(x+w+2,y+5),(x+w,y+9)],'leaf0')
    rect((x+1,y-1,x+w-1,y+5),'leaf1')
    for xx in range(x+2,x+w,6):
        rect((xx,y-2,xx+3,y+1),'grass0');rect((xx+1,y-2,xx+2,y-1),'grass')
        rect((xx+1,y+5,xx+3,y+6),'leaf0')

hedge(5,154,36);hedge(279,154,35)

d=layer('Vegetable beds')

def bed(x,y,w,h):
    rect((x-2,y-1,x+w+2,y+h+3),'grass0')
    poly([(x,y),(x+w,y),(x+w,y+h),(x+w-3,y+h+2),(x,y+h+2)],'wood0')
    rect((x+2,y+2,x+w-2,y+h-1),'#79533b')
    rect((x+3,y+3,x+w-3,y+h-2),'#97704b')
    rect((x,y,x+w,y+1),'wood1');rect((x,y,x+1,y+h),'wood1');rect((x+1,y+h-1,x+w-1,y+h),'wood')
    for yy in range(y+7,y+h-3,8):
        rect((x+4,yy+1,x+w-4,yy+2),'#765338')
        for xx in range(x+7,x+w-3,9):
            poly([(xx-3,yy),(xx-3,yy-2),(xx-1,yy-1),(xx,yy-4),(xx+1,yy-1),(xx+3,yy-3),(xx+3,yy),(xx,yy+2)],'leaf0')
            rect((xx-2,yy-2,xx-1,yy-1),'grass');rect((xx+1,yy-2,xx+2,yy-1),'grass0')
            if (xx+yy)%3==0: rect((xx,yy+1,xx+1,yy+2),'coral')

bed(16,169,46,23);bed(258,169,45,23)


d=layer('Flowers and garden details')

def flower(x,y,color):
    rect((x,y,x,y+4),'leaf1')
    rect((x-2,y+2,x-1,y+2),'grass0')
    for dx,dy in [(-1,-1),(1,-1),(-1,1),(1,1)]:rect((x+dx,y+dy,x+dx,y+dy),color)
    rect((x,y,x,y),'yellow')

for x,y in [(32,61),(39,66),(43,59),(26,67),(290,55),(296,60),(286,63),(62,42),(70,44),(76,41),(241,43),(247,45),(251,41),(53,145),(45,149),(39,142),(276,139),(284,144),(288,138),(96,181),(104,185),(111,181),(210,181),(219,185),(225,180)]:
    flower(x,y,R.choice([C['cream'],C['coral'],'#dca7bd']))

for x,y in [(34,100),(290,111),(79,161),(240,162),(117,43),(207,44),(14,138),(302,136)]:
    poly([(x-3,y),(x-2,y-3),(x+2,y-4),(x+4,y-1),(x+3,y+2),(x-2,y+2)],'#77866b')
    poly([(x-2,y-1),(x-1,y-3),(x+2,y-3),(x+3,y-1)],'#c5c7a3')
    rect((x-1,y-2,x+1,y-2),'cream')

for x,y in [(52,82),(267,91),(125,187),(190,189)]:
    rect((x+1,y+3,x+2,y+6),'cream')
    poly([(x-2,y+3),(x-2,y),(x,y-2),(x+3,y-2),(x+5,y),(x+5,y+3)],'wood0')
    poly([(x-1,y+1),(x-1,y),(x+1,y-1),(x+3,y),(x+4,y+1)],'coral')
    rect((x,y,x,y),'cream');rect((x+3,y+1,x+3,y+1),'cream')

for x,y in [(31,157),(287,159)]:
    rect((x-1,y-4,x+1,y+3),'wood0')
    poly([(x-8,y-7),(x+7,y-7),(x+8,y-2),(x+6,y),(x-6,y),(x-8,y-2)],'wood0')
    rect((x-6,y-6,x+6,y-2),'wood1')
    rect((x-5,y-5,x+5,y-4),'yellow')

layer_order = ['Meadow', 'Gathering clearing', 'Trees and hedges', 'Fence and stepping stones', 'Vegetable beds', 'Flowers and garden details']
layers.sort(key=lambda entry: layer_order.index(entry[0]))
im=Image.new('RGBA',(W,H))
for name,img in layers:
    im=Image.alpha_composite(im,img)
    img.resize((640,400),Image.Resampling.NEAREST).save(ROOT/f'garden-layer-{name.lower().replace(" ","-")}.png')
im.resize((640,400),Image.Resampling.NEAREST).save(OUT/'garden.png')
script=['local root = app.params.root or app.fs.currentPath', 'local sprite = Sprite(640, 400, ColorMode.RGB)']
for name,img in layers:
    path=f'/art/garden-layer-{name.lower().replace(" ","-")}.png'
    script.extend([f'local image = Image{{ fromFile=root .. "{path}" }}', 'local layer = sprite:newLayer()', f'layer.name = "{name}"', 'sprite:newCel(layer, 1, image, Point(0, 0))'])
script.extend(['sprite:deleteLayer(sprite.layers[1])', 'sprite:saveAs(root .. "/art/garden.aseprite")'])
(ROOT/'garden-import.lua').write_text('\n'.join(script)+'\n')
print('Generated garden and six editable layers')
