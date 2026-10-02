"""Regenerate the 1200x630 Road Tag social card from owner-supplied logo-v2 art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/og-image.png'
SOURCE = ROOT / 'logo-v2'
FONT = Path('C:/Windows/Fonts/msjh.ttc')

def font(size):
    return ImageFont.truetype(str(FONT), size)

image = Image.new('RGB', (1200, 630), '#F6F3EA')
with Image.open(SOURCE / 'ChatGPT Image Oct 2, 2026, 06_58_43 PM-3.png') as art:
    image.paste(ImageOps.fit(art.convert('RGB'), (560, 630), centering=(0.94, 0.5)), (640, 0))
with Image.open(SOURCE / 'ChatGPT Image Oct 2, 2026, 06_58_40 PM-1.png') as source:
    logo = source.convert('RGBA')
    logo.thumbnail((520, 174), Image.Resampling.LANCZOS)
    image.paste(logo, (52, 54), logo)
draw = ImageDraw.Draw(image)
draw.text((58, 260), '路見不平，', font=font(50), fill='#103637')
draw.text((58, 328), '一起標註', font=font(50), fill='#103637')
draw.text((60, 425), 'Road Tag', font=font(24), fill='#09595B')
draw.text((60, 472), '台灣騎樓與人行道通行回報', font=font(23), fill='#1F2D2D')
draw.text((60, 552), '查看附近障礙 · 回報現場狀況', font=font(19), fill='#526262')
image.save(OUT, format='PNG', optimize=True)
print(f'Wrote {OUT} ({image.width}x{image.height})')
