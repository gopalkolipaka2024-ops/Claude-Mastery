#!/usr/bin/env python3
"""Turn raw Open Food Facts photos into clean, delivery-app style product shots.

For each <cache>/<barcode>.jpg the script:
  1. cuts the product out of its background with rembg (open-source, MIT),
  2. fills holes in the cut-out, drops stray specks, and checks it still looks
     like one solid package (falls back to a plain border trim if not, so a
     bag whose printed food got cut out instead of the bag keeps its photo),
  3. centers it on pure white with even padding, lifts contrast slightly
     and sharpens it,
  4. writes <cache>/clean-v2/<barcode>.jpg (900px tall, 4:5 like the store's cards).

Already-processed photos are skipped, so later runs only handle new ones.
The edited photos are adaptations of CC BY-SA images and stay CC BY-SA.

Run:  python3 scripts/enhance_photos.py [cache_dir]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / ".photo-cache")
OUT = CACHE / "clean-v2"   # bump the name to re-process every photo
W, H = 720, 900          # 4:5, matches the 240x300 cards at 3x
PAD = 0.07               # white margin around the product
MIN_FILL = 0.6           # share of the cut-out's box that must be solid product
MODEL = "isnet-general-use"


def plain_trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((2, 2)))
    diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 28 else 0)
    box = diff.getbbox()
    if box and (box[2] - box[0]) * (box[3] - box[1]) > 0.25 * im.width * im.height:
        im = im.crop(box)
    return im


def clean_mask(alpha):
    """Fill holes, keep the main object (and anything close to its size), drop specks."""
    solid = np.asarray(alpha) > 128
    solid = ndimage.binary_fill_holes(solid)
    labels, n = ndimage.label(solid)
    if n == 0:
        return None
    sizes = ndimage.sum(solid, labels, range(1, n + 1))
    keep = [i + 1 for i, v in enumerate(sizes) if v >= 0.15 * sizes.max()]
    return np.isin(labels, keep)


def cut_out(im, session):
    """Return the product on white, or None if the cut-out looks wrong."""
    from rembg import remove
    rgba = remove(im, session=session, post_process_mask=True)
    mask = clean_mask(rgba.getchannel("A"))
    if mask is None or not mask.any():
        return None
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    bw, bh = x1 - x0, y1 - y0
    share = mask.sum() / mask.size
    fill = mask[y0:y1, x0:x1].mean()
    # a real package is one solid shape that fills a decent share of the photo
    if share < 0.08 or share > 0.97 or fill < MIN_FILL or bw < 0.15 * im.width or bh < 0.15 * im.height:
        return None
    # soften the edge slightly, keep rembg's own soft alpha where it agrees
    alpha = np.minimum(np.asarray(rgba.getchannel("A")), np.where(mask, 255, 0)).astype("uint8")
    alpha = Image.fromarray(np.maximum(alpha, np.where(ndimage.binary_erosion(mask, iterations=2), 255, 0).astype("uint8")))
    box = (int(x0), int(y0), int(x1), int(y1))
    rgb, alpha = im.crop(box), alpha.crop(box)  # original pixels, so filled holes keep their color
    white = Image.new("RGB", rgb.size, "white")
    white.paste(rgb, mask=alpha)
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
