#!/usr/bin/env python3
"""Match store products to Open Food Facts products that have photos.

Input:  catalog.js (store products) and an Open Food Facts extract
        (tab-separated: code, product_name, quantity, brands, categories_tags,
        countries_tags, unique_scans_n, image_url, completeness, main_category).
Output: data/photo-matches.json  {store name: {code, off_name, brands, score}}
        data/photo-matches-review.tsv  for a person to spot-check.

Only confident matches are kept: the brand has to match and most of the
remaining words have to agree. Anything unsure keeps its drawn image.

Run:  python3 scripts/match_photos.py /path/to/candidates.tsv
"""
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

STOP = set("the and of with in a an all types type pk pack cans can bottles bottle btl nr loose single oz fl ml l lb lbs ct "
           "g kg gal qt pt size original regular classic new flavor flavored flavour count bag box jar".split())
SYN = {"coke": "coca cola", "coca-cola": "coca cola", "mtn": "mountain", "lite": "lite", "choc": "chocolate",
       "bbq": "barbecue", "pb": "peanut butter", "&": "and", "w/": "with", "reeses": "reese's", "lays": "lay's",
       "m&m": "m&m's", "m&ms": "m&m's", "dr": "dr", "hood": "hood"}
# Store brands whose name differs from how Open Food Facts lists them.
BRAND_ALIASES = {
    "coca-cola": ["coca-cola", "coca cola", "coke"], "coke": ["coca-cola", "coca cola", "coke"],
    "diet": ["coca-cola", "pepsi", "diet coke", "diet pepsi"], "mtn": ["mountain dew", "mtn dew", "pepsi"],
    "lays": ["lay's", "lays", "frito lay"], "doritos": ["doritos", "frito lay"], "reese's": ["reese's", "hershey"],
    "m&m": ["m&m's", "mars"], "hood": ["hood", "h.p. hood"], "ben": ["ben & jerry's", "ben and jerry's"],
    "häagen-dazs": ["häagen-dazs", "haagen-dazs", "haagen dazs"], "poland": ["poland spring"],
    "boar's": ["boar's head", "boars head"], "oscar": ["oscar mayer"], "planters": ["planters"],
}


def toks(s):
    s = s.lower().replace("’", "'")
    s = re.sub(r"(\d)\s*(oz|ml|l|lb|ct|g|pk)\b", r"\1 \2", s)
    out = []
    for w in re.findall(r"[a-z0-9&'.-]+", s):
        w = w.strip(".-'")
        w = SYN.get(w, w)
        for x in w.split():
            x = x.replace("'s", "").replace("'", "")
            if x and x not in STOP and not re.fullmatch(r"\d+(\.\d+)?", x):
                out.append(x)
    return out


def sizes(s):
    s = s.lower()
    out = set()
    for n, u in re.findall(r"(\d+(?:\.\d+)?)\s*(fl\.? ?oz|oz|ml|cl|l|lb|g|kg|gal)\b", s):
        n = float(n)
        u = u.replace(".", "").replace(" ", "")
        ml = {"floz": 29.57, "oz": 29.57, "ml": 1, "cl": 10, "l": 1000, "gal": 3785, "lb": 453.6, "g": 1, "kg": 1000}[u]
        out.add(round(n * ml / 5) * 5)
    return out


def load_store():
    txt = (ROOT / "catalog.js").read_text()
    data = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
    return [(r[0], data["depts"][r[1]], data["aisles"][r[2]]) for r in data["items"]]


# Words that make one variety different from another. A photo of the wrong one misleads, so these must agree.
VARIANT = set("""lime lemon cherry grape grapefruit orange apple peach mango watermelon strawberry raspberry blueberry
blackberry pomegranate cranberry pineapple coconut passion tropical berry pumpkin banana kiwi pear plum melon
lamb beef chicken pork turkey ham bacon tuna salmon shrimp sausage pepperoni veggie vegetable
vanilla chocolate caramel mint peppermint cinnamon honey maple coffee mocha espresso hazelnut almond peanut
bbq barbecue spicy hot mild ranch sour cream onion salt vinegar jalapeno garlic cheddar nacho buffalo dill
diet zero light lite decaf unsweetened sweet red white rose rosé sparkling ipa lager stout porter pilsner
amber pale dark blonde wheat hazy double imperial gold silver black blue green spiced
whole skim fat-free reduced organic gluten-free chunky smooth crunchy creamy
non non-alcoholic nonalcoholic alcohol-free na n/a 0.0""".split())

DRINK_DEPTS = {"Beer", "Wine", "Spirits"}
ALCO = re.compile(r"alcoholic|beers?|wines?|spirits|liquors?|ciders?|hard-seltzer|vodkas?|whisk|rums?|gins?\b|tequila|liqueur|cocktail|champagne|prosecco|sake|soju|brandy|cognac")
NONALC = re.compile(r"0[.,]0\b|non[- ]?alcoholic|alcohol[- ]free|zero alcohol|sans alcool|\bn/a\b|\bna\b")
FOODY = re.compile(r"brittle|chips?|cheese|bread|candy|chocolate|sauce|mustard|pretzel|snack|cookie|cake|jerky|nuts?\b|"
                   r"popcorn|fudge|ice cream|soap|candle|batter|marinade|glaze|vinegar|gumm|lollipop|cupcake|sorbet")
DRINK = re.compile(r"beverages|drinks|waters|sodas|juices|teas|coffees")

GENERIC = re.compile(r"^(limes?|lemons?|oranges?|pears?|lettuce.*|russet potatoes.*|potatoes.*|cilantro.*|celery.*|"
                     r"carrot.*|onions?.*|bananas?|apples?|.*apple|build your own.*|extra meat|ice \d+ lb.*)$", re.I)


def main():
    src = sys.argv[1]
    off = []
    with open(src, encoding="utf-8", errors="replace") as f:
        for line in f:
            r = line.rstrip("\n").split("\t")
            if len(r) < 10 or not r[1]:
                continue
            code, name, qty, brands, cats, countries, scans, img, comp, maincat = r[:10]
            if not re.fullmatch(r"\d{8,14}", code):
                continue
            off.append(dict(code=code, name=name, qty=qty, brands=brands, cats=cats, us="united-states" in countries,
                            scans=int(float(scans or 0)), comp=float(comp or 0)))
    print("open food facts candidates:", len(off))

    # inverted index on name + brand tokens
    index = defaultdict(list)
    df = defaultdict(int)
    for i, o in enumerate(off):
        t = set(toks(o["brands"] + " " + o["name"]))
        o["toks"] = t
        o["btoks"] = set(toks(o["brands"]))
        o["sizes"] = sizes(o["qty"] + " " + o["name"])
        for w in t:
            index[w].append(i)
            df[w] += 1
    N = len(off)
    idf = lambda w: math.log((N + 1) / (df.get(w, 0) + 1))

    store = load_store()
    matches, review = {}, []
    for name, dept, aisle in store:
        if aisle == "Deli sandwiches" or GENERIC.match(name):
            continue
        st = toks(name)
        if not st:
            continue
        sset = set(st)
        brand = st[0]
        brand_words = {brand} | ({st[1]} if len(st) > 1 and len(brand) <= 4 else set())
        ssz = sizes(name)
        # candidates: products sharing the rarest store word
        rare = sorted(sset, key=lambda w: df.get(w, 0) or 1e9)
        cand = set()
        for w in rare[:2]:
            if df.get(w, 0) and df[w] < 60000:
                cand.update(index[w])
        best, bs = None, 0
        scored = []
        total = sum(idf(w) for w in sset)
        for i in cand:
            o = off[i]
            if not (brand in o["toks"] or any(a in o["brands"].lower() for a in BRAND_ALIASES.get(brand, []))):
                continue
            cats = o["cats"]
            if dept in DRINK_DEPTS and not ALCO.search(cats or o["name"].lower()):
                continue
            if dept in DRINK_DEPTS | {"Soft drinks"} and FOODY.search(o["name"].lower()) and not FOODY.search(name.lower()):
                continue
            if NONALC.search(o["name"].lower() + " " + cats) and not NONALC.search(name.lower()) and "non-alcoholic" not in aisle.lower():
                continue
            if dept not in DRINK_DEPTS and ALCO.search(cats):
                continue
            if dept == "Soft drinks" and not DRINK.search(cats):
                continue
            ov = VARIANT & o["toks"]
            sv = VARIANT & sset - brand_words
            if "variety" not in sset and (ov - sset or sv - o["toks"]):
                continue
            hit = sum(idf(w) for w in sset & o["toks"])
            rest = sset - brand_words
            rest_cov = (sum(idf(w) for w in rest & o["toks"]) / sum(idf(w) for w in rest)) if rest else 1
            if rest_cov < 0.6:
                continue
            if not rest and (o["toks"] - sset - o["btoks"]):
                continue
            if len(o["toks"] - sset - o["btoks"]) > max(2, len(rest)):
                continue
            cover = hit / total if total else 0
            extra = len(o["toks"] - sset - o["btoks"])
            s = cover - 0.04 * min(extra, 8)
            if ssz and o["sizes"]:
                s += 0.12 if ssz & o["sizes"] else -0.05
            if o["us"]:
                s += 0.05
            s += min(o["scans"], 500) / 5000 + o["comp"] / 20
            scored.append((s, o))
            if s > bs:
                best, bs = o, s
        if best and bs >= 0.8:
            alts = [o["code"] for sc, o in sorted(scored, key=lambda x: -x[0])
                    if o is not best and sc >= max(0.8, bs - 0.25)][:6]
            matches[name] = dict(code=best["code"], alts=alts, off_name=best["name"], brands=best["brands"], score=round(bs, 3))
            review.append((dept, aisle, name, best["brands"], best["name"], best["qty"], best["code"], f"{bs:.2f}"))

    (ROOT / "data" / "photo-matches.json").write_text(json.dumps(matches, indent=1, ensure_ascii=False))
    with open(ROOT / "data" / "photo-matches-review.tsv", "w") as f:
        f.write("department\taisle\tstore product\toff brand\toff product\toff size\tbarcode\tscore\n")
        for r in sorted(review):
            f.write("\t".join(r) + "\n")
    by = defaultdict(lambda: [0, 0])
    for name, dept, aisle in store:
        by[dept][1] += 1
        by[dept][0] += name in matches
    print("matched", len(matches), "of", len(store))
    for d, (m, t) in by.items():
        print(f"  {d}: {m}/{t}")


if __name__ == "__main__":
    main()
