#!/usr/bin/env python3
"""Download official product photos through the Kroger Developer API (free).

Needs a free app from https://developer.kroger.com (Products API, scope
product.compact). Set its credentials as environment variables:
    KROGER_CLIENT_ID, KROGER_CLIENT_SECRET

For each product it looks up the barcodes in data/kroger-upcs.csv; products
without a barcode hit are searched by name and only accepted when the brand
and the product's words agree. The front image is saved to
official-photos/<row>.jpg and listed in official-photos/found.csv. Already
found products are skipped, so it can run again each day under the API's
daily limit until everything is covered.

Run:  python3 scripts/kroger_api_photos.py [--limit-calls 9000] [--search-all]
"""
import base64
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "official-photos"
API = "https://api.kroger.com/v1"
CALLS = 0
LIMIT = int(sys.argv[sys.argv.index("--limit-calls") + 1]) if "--limit-calls" in sys.argv else 9000


class OutOfCalls(Exception):
    pass


def token():
    cid, secret = os.environ["KROGER_CLIENT_ID"], os.environ["KROGER_CLIENT_SECRET"]
    req = urllib.request.Request(f"{API}/connect/oauth2/token", method="POST",
                                 data=b"grant_type=client_credentials&scope=product.compact",
                                 headers={"Authorization": "Basic " + base64.b64encode(f"{cid}:{secret}".encode()).decode(),
                                          "Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        t = json.load(r)
    return t["access_token"], time.time() + t.get("expires_in", 1800) - 60


TOKEN = [None, 0]


def api(path):
    global CALLS
    if CALLS >= LIMIT:
        raise OutOfCalls
    if time.time() > TOKEN[1]:
        TOKEN[0], TOKEN[1] = token()
    CALLS += 1
    req = urllib.request.Request(f"{API}{path}", headers={"Authorization": f"Bearer {TOKEN[0]}", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise OutOfCalls
        if e.code in (400, 404):
            return None
        raise


def upce_to_upca(c):
    d, last = c[1:7], c[6]
    if last in "012":
        body = d[0:2] + last + "0000" + d[2:5]
    elif last == "3":
        body = d[0:3] + "00000" + d[3:5]
    elif last == "4":
        body = d[0:4] + "00000" + d[4]
    else:
        body = d[0:5] + "0000" + last
    return c[0] + body + c[7]


def kroger_id(code):
    """Kroger product ids are the UPC-A without its check digit, padded to 13 digits."""
    code = re.sub(r"\D", "", code)
    if len(code) == 8:
        code = upce_to_upca(code)
    return code[:-1].zfill(13)[-13:] if len(code) >= 12 else code.zfill(13)


def front_image(product):
    imgs = product.get("images") or []
    imgs = sorted(imgs, key=lambda i: (i.get("perspective") != "front", not i.get("featured")))
    for img in imgs:
        sizes = {s.get("size"): s.get("url") for s in img.get("sizes", [])}
        for size in ("xlarge", "large", "medium"):
            if sizes.get(size):
                return sizes[size]
    return None


def words(s):
    s = re.sub(r"\b\d+(\.\d+)?\s*(pk|oz|fl|ml|l|lb|ct|cans?|bottles?|pack)\b", " ", s.lower())
    return [w for w in re.findall(r"[a-z0-9']+", s) if w not in {"the", "and", "of", "with", "all", "types", "single", "loose"}]


def search(name):
    term = " ".join(words(name)[:5])
    if not term:
        return None
    res = api("/products?" + urllib.parse.urlencode({"filter.term": term, "filter.limit": 10})) or {}
    want = words(name)
    for p in res.get("data", []):
        have = set(words((p.get("brand") or "") + " " + (p.get("description") or "")))
        if want and want[0] in have and sum(w in have for w in want) >= max(2, round(0.75 * len(want))):
            return p
    return None


def main():
    if not os.environ.get("KROGER_CLIENT_ID"):
        print("Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET (free app at developer.kroger.com).")
        return
    rows = list(csv.DictReader(open(ROOT / "data" / "kroger-upcs.csv")))
    if "--search-all" in sys.argv:
        txt = (ROOT / "catalog.js").read_text()
        items = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])["items"]
        have = {r["name"] for r in rows}
        rows += [{"row": str(i), "name": r[0], "upcs": ""} for i, r in enumerate(items, 1) if r[0] not in have]
    OUT.mkdir(exist_ok=True)
    found_path = OUT / "found.csv"
    done = {r["name"] for r in csv.DictReader(open(found_path))} if found_path.exists() else set()
    new = not found_path.exists()
    found = 0
    with open(found_path, "a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["name", "file", "kroger_id"])
        try:
            for i, r in enumerate(rows, 1):
                if r["name"] in done:
                    continue
                product = None
                for code in r["upcs"].split():
                    res = api(f"/products/{kroger_id(code)}")
                    if res and res.get("data") and front_image(res["data"]):
                        product = res["data"]
                        break
                if not product:
                    product = search(r["name"])
                url = product and front_image(product)
                if url:
                    with urllib.request.urlopen(url, timeout=30) as img:
                        (OUT / f"{r['row']}.jpg").write_bytes(img.read())
                    w.writerow([r["name"], f"{r['row']}.jpg", product.get("productId", "")])
                    f.flush()
                    found += 1
                if i % 100 == 0:
                    print(f"{i}/{len(rows)} checked, {found} new photos, {CALLS} API calls", flush=True)
        except OutOfCalls:
            print("Reached today's API limit; the next run continues from here.")
    print(f"Saved {found} new official photos ({CALLS} API calls).")


if __name__ == "__main__":
    main()
