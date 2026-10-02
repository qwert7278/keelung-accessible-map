"""Compress the existing homepage banner to WebP without changing its design.

Run with Python + Pillow, like the existing generate-og-image.py helper.
The PNG remains the source; only the WebP is referenced by the homepage.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
for source in [
    root / "public/images/accessible-coastal-city-banner.png",
    root / "public/brand-mark.png",
]:
    target = source.with_suffix(".webp")
    with Image.open(source) as image:
        image.convert("RGBA" if "A" in image.getbands() else "RGB").save(
            target, "WEBP", quality=82, method=6
        )
    print(f"{source.name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes")
