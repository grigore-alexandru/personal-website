#!/usr/bin/env python3
"""
Regenerates the static brand assets in public/: the social-share fallback card
and the full favicon set.

This is NOT part of the build. It is a one-off generator, checked in so the
assets can be reproduced identically instead of being mystery binaries — run it
only when the wordmark or the palette changes:

    python3 scripts/generate-brand-assets.py

Requires Pillow and macOS system fonts. Everything it writes is committed, so a
normal `npm run build` never touches this file.

Palette and type are taken from src/styles/tokens.ts: white ground, black
wordmark, primary-600 (#2563eb) accent, neutral-600/400 for supporting text.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
BLUE = (37, 99, 235)          # primary-600
NEUTRAL_600 = (82, 82, 82)
NEUTRAL_400 = (163, 163, 163)
PERF = (240, 240, 240)        # sprocket holes, barely there

HELVETICA = "/System/Library/Fonts/HelveticaNeue.ttc"

# Stand-in for the site's Poppins, which only exists as woff2 (next/font) and so
# cannot be rasterised here. Faces are matched on their exact style name — the
# .ttc holds 14 of them and a substring test on "Bold" happily returns
# "Bold Italic", which is how the wordmark first came out oblique.
def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    want = "Bold" if bold else "Regular"
    for index in range(14):
        try:
            f = ImageFont.truetype(HELVETICA, size, index=index)
        except (OSError, IndexError):
            break
        if f.getname()[1] == want:
            return f
    raise RuntimeError(f"no {want} face in {HELVETICA}")


def og_default() -> None:
    """1200x630 share card. Deliberately JPEG and deliberately small: WhatsApp
    drops preview thumbnails over ~300KB and its WebP support is unreliable."""
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    # A column of sprocket holes bleeding off the right edge — the one detail
    # that says "film" without needing a photograph.
    hole_w, hole_h, gap = 34, 52, 28
    x = W - 96
    y = -20
    while y < H:
        d.rounded_rectangle([x, y, x + hole_w, y + hole_h], radius=8, fill=PERF)
        y += hole_h + gap

    left = 96
    d.text((left, 232), "Alexandru Grigore", font=font(88, bold=True), fill=BLACK)
    d.rectangle([left, 356, left + 132, 361], fill=BLUE)
    d.text((left, 398), "Video director & creative producer",
           font=font(36), fill=NEUTRAL_600)
    d.text((left, 524), "alexandrugrigore.com", font=font(26), fill=NEUTRAL_400)

    img.save(PUBLIC / "og-default.jpg", "JPEG", quality=88,
             optimize=True, progressive=True)


def mark(size: int, bg, fg, radius_ratio: float = 0.22) -> Image.Image:
    """The 'AG' monogram, drawn at 4x and downsampled so small sizes stay crisp."""
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=bg)

    f = font(int(s * 0.46), bold=True)
    box = d.textbbox((0, 0), "AG", font=f)
    d.text(((s - (box[2] - box[0])) / 2 - box[0],
            (s - (box[3] - box[1])) / 2 - box[1]), "AG", font=f, fill=fg)

    return img.resize((size, size), Image.LANCZOS)


def icons() -> None:
    mark(32, BLACK, WHITE).save(PUBLIC / "favicon-32x32.png")
    mark(16, BLACK, WHITE).save(PUBLIC / "favicon-16x16.png")

    # .ico carries every size a browser or OS might reach for.
    mark(256, BLACK, WHITE).save(
        PUBLIC / "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    # iOS masks the corners itself, so this one ships square and opaque.
    apple = Image.new("RGB", (180, 180), BLACK)
    apple.paste(mark(180, BLACK, WHITE, radius_ratio=0), (0, 0),
                mark(180, BLACK, WHITE, radius_ratio=0))
    apple.save(PUBLIC / "apple-touch-icon.png")

    # Android home screen / PWA install.
    for px in (192, 512):
        mark(px, BLACK, WHITE, radius_ratio=0).convert("RGB").save(
            PUBLIC / f"icon-{px}.png")


if __name__ == "__main__":
    PUBLIC.mkdir(exist_ok=True)
    og_default()
    icons()
    print("wrote:", ", ".join(sorted(p.name for p in PUBLIC.iterdir()
                                     if p.suffix in {".jpg", ".png", ".ico"})))
