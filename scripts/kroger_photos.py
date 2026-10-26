#!/usr/bin/env python3
"""Download official front-of-pack photos from Kroger by barcode. Run this on your own computer.

Kroger serves product photos at
    https://www.kroger.com/product/images/large/front/<13-digit UPC without check digit>
This script tries every barcode we have for each product (data/kroger-upcs.csv)
and saves the first photo that exists to official-photos/<row number>.jpg, plus
official-photos/found.csv. Upload or commit the official-photos folder and the
page is rebuilt from it.

Run:  python3 scripts/kroger_photos.py            (needs Python 3, nothing else)
Optional: --pos my-bottle-pos-export.csv  with columns "name" and "upc"
"""
import csv
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "official-photos"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
                         "Chrome/126.0 Safari/537.36", "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
           "Referer": "https://www.kroger.com/"}


def upce_to_upca(c):
    """Expand an 8-digit UPC-E barcode to 12-digit UPC-A."""
    d = c[1:7]
    last = d[5]
    if last in "012":
        body = d[0:2] + last + "0000" + d[2:5]
    elif last == "3":
        body = d[0:3] + "00000" + d[3:5]
    elif last == "4":
        body = d[0:4] + "00000" + d[4]
    else:
        body = d[0:5] + "0000" + last
    return c[0] + body + c[7]


def kroger_ids(code):
    """Kroger's 13-digit id is the UPC-A without its check digit, left-padded with zeros."""
    code = "".join(ch for ch in code if ch.isdigit())
    if len(code) == 8:
        code = upce_to_upca(code)
    ids = []
    if len(code) >= 12:
        ids.append(code[:-1].zfill(13)[-13:])   # drop check digit
    ids.append(code.zfill(13)[-13:])            # in case the code had no check digit
    return list(dict.fromkeys(ids))


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
        if r.headers.get_content_type().startswith("image/") and len(data) > 3000:
            return data
    return None


def main():
    rows = list(csv.DictReader(open(ROOT / "data" / "kroger-upcs.csv")))
    if "--pos" in sys.argv:
        for r in csv.DictReader(open(sys.argv[sys.argv.index("--pos") + 1])):
            rows.append({"row": f"pos{len(rows)}", "name": r["name"], "upcs": r["upc"]})
    OUT.mkdir(exist_ok=True)
    found_path = OUT / "found.csv"
    done = {r["name"] for r in csv.DictReader(open(found_path))} if found_path.exists() else set()
    with open(found_path, "a", newline="") as f:
        w = csv.writer(f)
        if not done:
            w.writerow(["name", "file", "kroger_id"])
        for i, r in enumerate(rows, 1):
            if r["name"] in done:
                continue
            for code in r["upcs"].split():
                hit = None
                for kid in kroger_ids(code):
                    try:
                        data = fetch(f"https://www.kroger.com/product/images/large/front/{kid}")
                    except Exception:  # noqa: BLE001
                        data = None
                    if data:
                        hit = (kid, data)
                        break
                    time.sleep(0.3)
                if hit:
                    name = f"{r['row']}.jpg"
                    (OUT / name).write_bytes(hit[1])
                    w.writerow([r["name"], name, hit[0]])
                    f.flush()
                    print(f"[{i}/{len(rows)}] found  {r['name']}")
                    break
            else:
                print(f"[{i}/{len(rows)}] none   {r['name']}")
    print("Done. Upload the official-photos folder.")


if __name__ == "__main__":
    main()
