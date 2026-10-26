#!/usr/bin/env python3
"""Download a front-of-pack photo for every matched product.

Photos come from the Open Food Facts image archive on AWS Open Data
(s3://openfoodfacts-images, CC BY-SA, contributed by Open Food Facts users).
The archive holds each product's original uploads, so for every product we
read the text recognition saved next to each photo and skip nutrition panels
and ingredient lists, keeping the photo that looks like the front.

Input:  data/photo-matches.json (from match_photos.py)
Output: <cache>/<barcode>.jpg (full-resolution originals) and data/photo-sources.json

Run:  python3 scripts/fetch_photos.py [cache_dir]
"""
import gzip
import io
import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / ".photo-cache")
BUCKET = "https://openfoodfacts-images.s3.eu-west-3.amazonaws.com"
BACK = re.compile(r"nutrition facts|supplement facts|ingredients|serving size|% ?daily value|amount per serving|"
                  r"distributed by|manufactured by|calories|total fat|sodium|keep refrigerated|recycl|barcode|citric acid|"
                  r"natural flavou?rs?|vitamin|potassium|protein|carbohydrate|sugars|kcal|\bkj\b|contains:|allergen|"
                  r"best before|best by|for questions|www\.|\.com", re.I)
MIN_FRONT = 2
NONALC = re.compile(r"0[.,]0\s*%?|alcohol[- ]free|non[- ]?alcoholic|sans alcool|zero alcohol", re.I)


def get(url, binary=False, tries=3):
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            err = e
    raise err


def folder(code):
    if len(code) <= 8:
        return code
    code = code.zfill(13)
    return f"{code[:3]}/{code[3:6]}/{code[6:9]}/{code[9:]}"


def pick_front(code, brand, store_name=""):
    base = f"data/{folder(code)}/"
    xml = get(f"{BUCKET}/?list-type=2&prefix={base}")
    ids = sorted({int(m) for m in re.findall(re.escape(base) + r"(\d+)\.400\.jpg", xml)})
    if not ids:
        return None, None
    best, best_score = ids[0], -99
    brand_words = [w for w in re.findall(r"[a-z]{3,}", brand.lower())][:2]
    for i in ids[:8]:
        try:
            ocr = json.loads(gzip.decompress(get(f"{BUCKET}/{base}{i}.json.gz", binary=True)))
            r = ocr.get("responses", [{}])[0]
        except Exception:  # noqa: BLE001
            r = {}
        text = (r.get("fullTextAnnotation") or {}).get("text", "")
        score = 0
        score += 2 if r.get("logoAnnotations") else 0
        score += 2 if any(w in text.lower() for w in brand_words) else 0
        score -= 3 * min(len(BACK.findall(text)), 3)
        score -= 1 if len(text) > 450 else 0
        score += 1 if i == ids[0] else 0
        if NONALC.search(text) and not NONALC.search(store_name) and not re.search(r"\bn/?a\b|athletic|free wave", store_name, re.I):
            score -= 10
        if score > best_score:
            best, best_score = i, score
    return f"{BASE_URL(base)}{best}.400.jpg", best_score


def BASE_URL(base):
    return f"{BUCKET}/{base}"


def work(item):
    """Try the matched product, then its close alternatives, until one has a clear front photo."""
    name, m = item
    key = m["code"]
    out, meta = CACHE / f"{key}.jpg", CACHE / f"{key}.json"
    if out.exists() and meta.exists():
        info = json.loads(meta.read_text())
        if "full" in info:
            return name, info
    best = None
    try:
        for code in [m["code"]] + m.get("alts", []):
            url, score = pick_front(code, m["brands"] + " " + name, name)
            if url and (best is None or score > best[1]):
                best = (url, score, code)
            if url and score >= MIN_FRONT:
                break
        if not best:
            return name, None
        # the full-size upload, not the 400px thumbnail; fall back to the thumbnail
        url = best[0]
        try:
            data = get(url.replace(".400.jpg", ".jpg"), binary=True)
            url = url.replace(".400.jpg", ".jpg")
        except Exception:  # noqa: BLE001
            data = get(url, binary=True)
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        im.thumbnail((1600, 1600), Image.LANCZOS)  # plenty for cleanup, keeps the cache small
        im.save(out, "JPEG", quality=92)
        (CACHE / "clean" / f"{key}.jpg").unlink(missing_ok=True)  # re-clean the new photo
        info = {"code": key, "photo_code": best[2], "url": url, "front_score": best[1], "full": True}
        meta.write_text(json.dumps(info))
        return name, info
    except Exception as e:  # noqa: BLE001
        return name, {"error": str(e)}


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    matches = json.loads((ROOT / "data" / "photo-matches.json").read_text())
    # one download per barcode
    by_code = {}
    for name, m in matches.items():
        by_code.setdefault(m["code"], (name, m))
    results = {}
    done = 0
    with ThreadPoolExecutor(24) as ex:
        for name, info in ex.map(work, by_code.values()):
            done += 1
            if info:
                results[name] = info
            if done % 200 == 0:
                print("fetched", done, "of", len(by_code), flush=True)
    sources = {}
    for name, m in matches.items():
        info = results.get(by_code[m["code"]][0])
        if info and "url" in info and info["front_score"] >= MIN_FRONT:
            sources[name] = info
    (ROOT / "data" / "photo-sources.json").write_text(json.dumps(sources, indent=1, ensure_ascii=False))
    errs = sum(1 for v in results.values() if v and "error" in v)
    print("photos for", len(sources), "products;", errs, "errors", flush=True)


if __name__ == "__main__":
    main()
