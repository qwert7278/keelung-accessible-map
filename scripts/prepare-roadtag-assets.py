"""Export owner-supplied logo-v2 assets for the website; preserve originals.

This only resizes and compresses the supplied artwork. No recoloring or redraw.
Run with Python + Pillow.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "logo-v2"
TARGET = ROOT / "public/images"
ASSETS = {
    "06_58_40 PM-1": ("roadtag-logo-horizontal.webp", 1086),
    "06_58_43 PM-3": ("roadtag-hero.webp", 1916),
    "06_58_45 PM-4": ("roadtag-footer.webp", 1916),
    "07_06_54 PM-2": ("roadtag-icon-map.webp", 168),
    "07_06_58 PM-5": ("roadtag-icon-info.webp", 168),
    "07_06_55 PM-3": ("roadtag-icon-report.webp", 168),
}

TARGET.mkdir(parents=True, exist_ok=True)
for suffix, (name, max_width) in ASSETS.items():
    source = SOURCE / f"ChatGPT Image Oct 2, 2026, {suffix}.png"
    with Image.open(source) as original:
        image = original.convert("RGBA" if "A" in original.getbands() else "RGB")
        if image.width > max_width:
            image = image.resize((max_width, round(image.height * max_width / image.width)), Image.Resampling.LANCZOS)
        target = TARGET / name
        image.save(target, "WEBP", quality=85, method=6)
    print(f"{name}: {target.stat().st_size:,} bytes")
