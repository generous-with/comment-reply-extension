"""Export the project's simple vector logo as antialiased PNGs (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

assets = Path(__file__).resolve().parents[1] / 'assets'
scale = 4
im = Image.new('RGBA', (512*scale, 512*scale))
d = ImageDraw.Draw(im)
def box(coords): return tuple(round(x*scale) for x in coords)
def points(coords): return [(round(x*scale), round(y*scale)) for x,y in coords]
teal = '#126B70'
d.rounded_rectangle(box((16,16,496,496)),radius=112*scale,fill=teal)
d.rounded_rectangle(box((108,136,380,346)),radius=42*scale,fill='white')
d.polygon(points([(150,320),(150,402),(228,346)]),fill='white')
# Reply arrow with rounded joins and caps.
line=[(230,206),(188,248),(230,290)]
# Sample the quadratic turn matching the SVG path.
curve=[((1-t)**2*266+2*(1-t)*t*310+t*t*310,(1-t)**2*248+2*(1-t)*t*248+t*t*292) for t in [i/100 for i in range(101)]]
d.line(points(line),fill=teal,width=28*scale,joint='curve')
d.line(points([(192,248),(266,248)]+curve),fill=teal,width=28*scale,joint='curve')
for x,y in line+[(192,248),(310,292)]: d.ellipse(box((x-14,y-14,x+14,y+14)),fill=teal)
star=[]
for a,b,c in [((378,76),(387,119),(426,126)),((426,126),(387,135),(378,176)),((378,176),(369,135),(330,126)),((330,126),(369,119),(378,76))]:
    for i in range(31):
        t=i/30
        star.append(((1-t)**2*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)**2*a[1]+2*(1-t)*t*b[1]+t*t*c[1]))
d.polygon(points(star),fill='#FFCE70')
for size in (16,32,48,128,512):
    im.resize((size,size),Image.Resampling.LANCZOS).save(assets / f'icon-{size}.png')
