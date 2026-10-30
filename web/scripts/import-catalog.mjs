// Converts ../catalog.js (built from the Bottle POS export by scripts/build_catalog.py)
// into src/data/catalog.json for the site. Phase 3 replaces this with the database sync.
// Every product and category gets a stable, human-readable slug.
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(new URL("../../catalog.js", import.meta.url), "utf8");
const C = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));

export const slugify = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const DEPT = {
  Beer: { slug: "beer", name: "Beer & Seltzers" },
  Wine: { slug: "wine", name: "Wine" },
  Spirits: { slug: "spirits", name: "Spirits" },
  "Soft drinks": { slug: "soft-drinks", name: "Soft Drinks & Water" },
  Grocery: { slug: "grocery", name: "Grocery" },
};

const seen = new Map();
const products = C.items.map((r, i) => {
  const [name, d, a, size, , gd, shape, body, ink, flv, note] = r;
  let slug = slugify(name) || `item-${i + 1}`;
  const n = (seen.get(slug) ?? 0) + 1;
  seen.set(slug, n);
  if (n > 1) slug = `${slug}-${n}`;
  const dept = C.depts[d], aisle = C.aisles[a];
  const [pack, volume] = parseSize(size, name);
  return {
    id: i + 1, slug, name, rank: i + 1,
    dept: DEPT[dept].slug, aisle: slugify(aisle),
    pack, volume, gameDay: !!gd,
    art: { dept, aisle, shape: C.shapes[shape], body: C.palette[body], ink: C.palette[ink], flv: flv >= 0 ? C.palette[flv] : "" },
    ...(note ? { note } : {}),
  };
});

function parseSize(size, name) {
  const s = `${size ?? ""} ${name}`;
  const pk = s.match(/(\d+)\s*pk\b/i);
  const vol = s.match(/(\d+(?:\.\d+)?)\s*(fl\.? ?oz|oz|ml|l|lb|gal|qt|pt|ct)\b/i);
  const unit = vol ? vol[2].toLowerCase().replace(/fl\.? ?oz/, "oz") : "";
  return [pk ? `${pk[1]} pk` : null, vol ? `${vol[1]} ${unit === "l" ? "L" : unit}` : null];
}

const categories = Object.entries(DEPT).map(([key, d]) => {
  const aisles = [...new Set(products.filter((p) => p.dept === d.slug).map((p) => p.art.aisle))];
  return {
    slug: d.slug, name: d.name,
    children: aisles
      .map((a) => ({ slug: slugify(a), name: a, count: products.filter((p) => p.dept === d.slug && p.art.aisle === a).length }))
      .sort((x, y) => y.count - x.count),
    count: products.filter((p) => p.dept === d.slug).length,
  };
});

writeFileSync(new URL("../src/data/catalog.json", import.meta.url), JSON.stringify({ source: "Bottle POS stock export (one-time)", categories, products }));
console.log(`${products.length} products, ${categories.length} departments, ${categories.reduce((n, c) => n + c.children.length, 0)} aisles`);
