# Adams Shore Super Market & Liquors — online store

Storefront for 494 Sea St, Quincy: cooler, deli sandwich builder, and every product on the shelf
with a drawn package image.

| Path | What it is |
| --- | --- |
| `src/store.html` | The page (edit this). Store details are in `CONFIG` near the top of the script. |
| `catalog.js` | Product list, generated. Do not edit by hand. |
| `data/pos-export-raw.json` | Bottle POS export the catalog is built from. |
| `scripts/build_catalog.py` | Cleans names, sorts products into departments and aisles, picks each product's package shape and colors. |
| `scripts/build_site.py` | Wraps the page into `docs/` for web hosting. |
| `scripts/match_photos.py` | Matches products to Open Food Facts entries (brand, flavor and drink type must agree). Writes `data/photo-matches-review.tsv` for spot checks. |
| `scripts/fetch_photos.py` | Downloads a front-of-pack photo per match from the Open Food Facts image archive, skipping nutrition and ingredient panels. |
| `scripts/enhance_photos.py` | Cuts each photo out of its background and centers it on white; keeps the plain photo when the cut-out goes wrong. |
| `data/photo-exclude.txt` | Products whose photo is wrong. Add a name to show the drawn package instead. |
| `scripts/build_photo_sheets.py` | Packs the photos into `photos/sheet-NN.webp` sprite sheets plus `photos/index.js`. |
| `docs/` | Ready-to-host site (GitHub Pages: Settings → Pages → branch, folder `/docs`). |

## Product photos

2,282 products show a real photo from [Open Food Facts](https://world.openfoodfacts.org) (CC BY-SA,
credited in the footer). The rest show a drawn package until a photo is added. To refresh photos,
stream the Open Food Facts CSV export into a candidates file (see the docstring in `match_photos.py`), then:

```sh
python3 scripts/match_photos.py candidates.tsv
python3 scripts/fetch_photos.py .photo-cache
python3 scripts/enhance_photos.py .photo-cache
python3 scripts/build_photo_sheets.py .photo-cache
```

### Automatic cleanup (free, runs in the cloud)

`.github/workflows/product-photos.yml` runs weekly on GitHub Actions (or on demand from the
Actions tab). It downloads each matched product's full-size photo from Open Food Facts,
removes the background with the open-source [rembg](https://github.com/danielgatis/rembg)
model (`scripts/enhance_photos.py`), centers the product on white like a delivery-app listing,
rebuilds `photos/` and `docs/`, and commits them. No API keys needed. The cleaned photos are
adaptations of CC BY-SA images, so they stay CC BY-SA and the footer credit must stay.

Kroger API photos were dropped: Kroger's terms (§5e) don't allow storing or publicly
displaying API content outside a live app.

## Rebuild

```sh
python3 scripts/build_catalog.py   # after a new POS export
python3 scripts/build_site.py      # after editing src/store.html
```

## Still needed from the store

- Prices: add to `PRICES` in `src/store.html`, or send the Bottle POS item export with prices.
- Photos for the remaining products (mostly wine, spirits and local craft beer): set
  `PHOTOS["Product name"] = "photos/file.webp"` in `src/store.html`.
- Order email and the store's own DoorDash and Uber Eats links (`CONFIG`).
- Deli: confirm the sandwich names and builder options match the real menu.
