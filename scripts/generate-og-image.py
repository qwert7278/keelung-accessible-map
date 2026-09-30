"""Regenerate the 1200x630 social card with Pillow (optional design-time tool)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-image.png"
FONT = Path("C:/Windows/Fonts/msjh.ttc")

def font(size):
    return ImageFont.truetype(str(FONT), size)

image = Image.new("RGB", (1200, 630), "#f7f9f8")
draw = ImageDraw.Draw(image)
draw.rectangle((0, 0, 1200, 14), fill="#155e52")

# Brand lockup
draw.rounded_rectangle((74, 68, 128, 122), radius=15, fill="#155e52")
draw.text((87, 76), "路", font=font(32), fill="white")
draw.text((147, 72), "基隆好行", font=font(27), fill="#155e52")
draw.text((148, 108), "KEELUNG ACCESSIBLE MAP", font=font(12), fill="#5c716b")

# Main message
draw.text((74, 195), "基隆無障礙", font=font(54), fill="#183d35", stroke_width=1)
draw.text((74, 263), "通行地圖", font=font(54), fill="#183d35", stroke_width=1)
draw.rounded_rectangle((76, 345, 390, 350), radius=3, fill="#78a795")
draw.text((76, 380), "查看附近通行狀況", font=font(24), fill="#344e46")
draw.text((76, 419), "回報人行道・騎樓・路口障礙", font=font(19), fill="#5c716b")
draw.rounded_rectangle((76, 490, 343, 542), radius=12, fill="#155e52")
draw.text((100, 501), "查看地圖與回報", font=font(19), fill="white")
draw.text((76, 577), "社群紀錄，不代表政府公告。", font=font(15), fill="#657972")

# A calm, schematic map illustration (not a claimed survey or navigation route).
draw.rounded_rectangle((628, 55, 1125, 575), radius=28, fill="#e8f0ec", outline="#d4e0da", width=2)
for box, color in [
    ((655, 84, 782, 176), "#d8e7df"), ((808, 80, 939, 155), "#dce9e2"),
    ((972, 87, 1095, 185), "#d5e4dc"), ((660, 226, 780, 326), "#d9e7df"),
    ((968, 248, 1097, 341), "#dbe9e1"), ((655, 390, 778, 535), "#d7e6dd"),
    ((814, 428, 942, 541), "#dce9e2"), ((977, 402, 1095, 537), "#d6e5dc"),
]:
    draw.rounded_rectangle(box, radius=16, fill=color)

# Streets and crossing. The diagram is illustrative, not a navigable route.
road = "#fffdfa"
draw.line([(630, 199), (1124, 220)], fill=road, width=39)
draw.line([(630, 360), (1124, 372)], fill=road, width=43)
draw.line([(797, 55), (786, 575)], fill=road, width=38)
draw.line([(954, 55), (964, 575)], fill=road, width=40)
draw.line([(645, 548), (1090, 76)], fill="#f8fbf9", width=23)

def pin(cx, cy, color):
    draw.ellipse((cx-24, cy-24, cx+24, cy+24), fill="#ffffff", outline="#d9e3de", width=3)
    draw.ellipse((cx-14, cy-14, cx+14, cy+14), fill=color)
    draw.ellipse((cx-5, cy-5, cx+5, cy+5), fill="#ffffff")

pin(866, 286, "#b63838")
pin(1030, 385, "#8c5b09")
pin(740, 407, "#21816b")
draw.rounded_rectangle((700, 111, 870, 152), radius=10, fill="#ffffff", outline="#dce5e1")
draw.text((716, 120), "人行道・騎樓", font=font(14), fill="#344e46")
draw.rounded_rectangle((915, 464, 1088, 505), radius=10, fill="#ffffff", outline="#dce5e1")
draw.text((932, 473), "路口・斜坡", font=font(14), fill="#344e46")

image.save(OUT, format="PNG", optimize=True)
print(f"Wrote {OUT} ({image.width}x{image.height})")
