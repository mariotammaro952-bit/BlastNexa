"""Package the Image Gen artwork into Android launcher resources.

Only sizing, compositing and Android masks are applied to the original asset.
"""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artwork/blastnexa-icon-v26-foreground.png'
art = Image.open(SOURCE).convert('RGBA')
mask = art.getchannel('A').point(lambda a: 255 if a >= 24 else 0)
art = art.crop(mask.getbbox())
cx, cy = art.width / 2, art.height / 2
opaque = art.getchannel('A')
radius = max(math.hypot(x-cx, y-cy) for y in range(art.height) for x in range(art.width) if opaque.getpixel((x,y)) >= 96)
outputs = []

def emblem(size, safe_radius):
    scale = size * safe_radius / radius
    image = art.resize((round(art.width*scale),round(art.height*scale)),Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA',(size,size))
    canvas.alpha_composite(image,((size-image.width)//2,(size-image.height)//2))
    return canvas

def save(image, relative):
    path = ROOT / relative
    path.parent.mkdir(parents=True,exist_ok=True)
    image.save(path,optimize=True)
    outputs.append({'path':relative,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})

save(emblem(432,.30),'app/src/main/res/drawable-nodpi/ic_launcher_foreground.png')
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    square = Image.new('RGBA',(size,size),'#4314BD')
    square.alpha_composite(emblem(size,.39))
    for kind in ['ic_launcher','ic_launcher_round']:
        image = square.copy()
        clip = Image.new('L',(size,size))
        draw = ImageDraw.Draw(clip)
        if kind.endswith('round'): draw.ellipse((0,0,size-1,size-1),fill=255)
        else: draw.rounded_rectangle((0,0,size-1,size-1),radius=round(size*.20),fill=255)
        image.putalpha(clip)
        save(image,f'app/src/main/res/mipmap-{density}/{kind}.png')
play = Image.new('RGBA',(512,512),'#4314BD')
play.alpha_composite(emblem(512,.39))
save(play.convert('RGB'),'artwork/blastnexa-play-icon-v26.png')
(ROOT/'artwork/launcher-v26.json').write_text(json.dumps({'source':str(SOURCE.relative_to(ROOT)),'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'adaptive_safe_radius':.30,'files':outputs},indent=2)+'\n')
print('Packaged original neon artwork:',len(outputs),'Android/Play icon files')
