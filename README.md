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
| `docs/` | Ready-to-host site (GitHub Pages: Settings → Pages → branch, folder `/docs`). |

## Rebuild

```sh
python3 scripts/build_catalog.py   # after a new POS export
python3 scripts/build_site.py      # after editing src/store.html
```

## Still needed from the store

- Prices: add to `PRICES` in `src/store.html`, or send the Bottle POS item export with prices.
- Real photos (optional): set `PHOTOS["Product name"] = "photos/file.webp"`; drawn art is used otherwise.
- Order email and the store's own DoorDash and Uber Eats links (`CONFIG`).
- Deli: confirm the sandwich names and builder options match the real menu.
