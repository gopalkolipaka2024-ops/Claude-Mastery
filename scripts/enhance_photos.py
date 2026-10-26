#!/usr/bin/env python3
"""Turn raw Open Food Facts photos into clean, delivery-app style product shots.

For each <cache>/<barcode>.jpg the script:
  1. cuts the product out of its background with rembg (open-source, MIT),
  2. checks the cut-out looks sane (falls back to a plain border trim if not),
  3. centers it on pure white with even padding, lifts contrast slightly
     and sharpens it,
  4. writes <cache>/clean/<barcode>.jpg (900px tall, 4:5 like the store's cards).

Already-processed photos are skipped, so later runs only handle new ones.
The edited photos are adaptations of CC BY-SA images and stay CC BY-SA.

Run:  python3 scripts/enhance_photos.py [cache_dir]
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / ".photo-cache")
OUT = CACHE / "clean"
W, H = 720, 900          # 4:5, matches the 240x300 cards at 3x
PAD = 0.07               # white margin around the product
MODEL = "isnet-general-use"


def plain_trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((2, 2)))
    diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 28 else 0)
    box = diff.getbbox()
    if box and (box[2] - box[0]) * (box[3] - box[1]) > 0.25 * im.width * im.height:
        im = im.crop(box)
    return im


def cut_out(im, session):
    """Return the product on white, or None if the cut-out looks wrong."""
    from rembg import remove
    rgba = remove(im, session=session, post_process_mask=True)
    alpha = rgba.getchannel("A")
    box = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
    if not box:
        return None
    hist = alpha.histogram()
    solid = sum(hist[128:]) / (im.width * im.height)
    bw, bh = box[2] - box[0], box[3] - box[1]
    # a real package fills a decent share of the photo and isn't a sliver
    if solid < 0.08 or solid > 0.97 or bw < 0.15 * im.width or bh < 0.15 * im.height:
        return None
    rgba = rgba.crop(box)
    white = Image.new("RGB", rgba.size, "white")
    white.paste(rgba, mask=rgba.getchannel("A"))
    return white


def finish(im):
    im = ImageOps.autocontrast(im, cutoff=0.5, preserve_tone=True)
    im = ImageEnhance.Color(im).enhance(1.06)
    inner_w, inner_h = int(W * (1 - 2 * PAD)), int(H * (1 - 2 * PAD))
    scale = min(inner_w / im.width, inner_h / im.height)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))
    canvas = Image.new("RGB", (W, H), "white")
    canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
    return canvas


def main():
    from rembg import new_session
    OUT.mkdir(parents=True, exist_ok=True)
    todo = [p for p in sorted(CACHE.glob("*.jpg")) if not (OUT / p.name).exists()]
    print(len(todo), "photos to clean up", flush=True)
    session = new_session(MODEL)
    cut = fallback = failed = 0
    for i, src in enumerate(todo, 1):
        try:
            im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
            im.thumbnail((1600, 1600), Image.LANCZOS)
            product = cut_out(im, session)
            if product is None:
                product, fallback = plain_trim(im), fallback + 1
            else:
                cut += 1
            finish(product).save(OUT / src.name, "JPEG", quality=92, optimize=True)
        except Exception as e:  # noqa: BLE001
            failed += 1
            print("skip", src.name, e, flush=True)
        if i % 100 == 0:
            print("cleaned", i, "of", len(todo), flush=True)
    print(f"background removed: {cut}, border trim only: {fallback}, failed: {failed}")


if __name__ == "__main__":
    main()
