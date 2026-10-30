import type { Product } from "./catalog";
import { isOnSale } from "@/components/PriceBlock";

/* Listing state lives in the URL:
   ?aisle=a,b&pack=12+pk&volume=12+oz&brand=x&country=y&varietal=z&min=10&max=30&stock=in&sort=name-asc&page=2 */
export const PAGE_SIZE = 36;
export type Sort = "relevance" | "name-asc" | "price-asc" | "price-desc" | "newest";
export const FACET_IDS = ["aisle", "brand", "pack", "volume", "country", "varietal"] as const;
export type FacetId = (typeof FACET_IDS)[number];
export type ListingParams = Record<FacetId, string[]> & { sort: Sort; page: number; inStock: boolean; min: number | null; max: number | null };
type SP = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(",") : v ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);
const num = (v: string | string[] | undefined) => { const n = Number(Array.isArray(v) ? v[0] : v); return Number.isFinite(n) && n >= 0 && n < 100000 ? n : null; };

export function parseParams(sp: SP, available: Sort[]): ListingParams {
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as Sort;
  const page = Math.max(1, Math.min(500, parseInt(String(sp.page ?? "1"), 10) || 1));
  const facets = Object.fromEntries(FACET_IDS.map((f) => [f, list(sp[f])])) as Record<FacetId, string[]>;
  return { ...facets, sort: available.includes(sort) ? sort : "relevance", page, inStock: sp.stock === "in", min: num(sp.min), max: num(sp.max) };
}

/** Effective price in cents right now (sale price while a sale runs). */
export const priceNow = (p: Product, now = new Date()) => (p.price.regularCents == null ? null : isOnSale(p.price, now) ? p.price.saleCents! : p.price.regularCents);

/** Which sorts and filters make sense for the data we actually have. */
export function capabilities(products: Product[]) {
  const priced = products.some((p) => p.price.regularCents != null);
  const created = products.map((p) => p.createdAt).filter(Boolean) as string[];
  const spread = created.length ? Math.max(...created.map(Date.parse)) - Math.min(...created.map(Date.parse)) : 0;
  const sorts: Sort[] = ["relevance", "name-asc"];
  if (priced) sorts.push("price-asc", "price-desc");
  if (spread > 2 * 86_400_000) sorts.push("newest"); // only once products arrived on different days
  return { sorts, priced, stock: products.some((p) => p.quantity != null) };
}

const sizeOrder = (v: string) => {
  const m = v.match(/([\d.]+)\s*(pk|oz|ml|L|lb|gal|qt|pt|ct)/);
  if (!m) return 1e9;
  return parseFloat(m[1]!) * ({ pk: 1, ml: 1, L: 1000, oz: 29.57, lb: 454, gal: 3785, qt: 946, pt: 473, ct: 1 } as Record<string, number>)[m[2]!]!;
};

export type FacetOut = { id: FacetId; label: string; options: { value: string; label: string; count: number }[] };
const FACETS: { id: FacetId; label: string; key: (p: Product) => string | null; order: "count" | "size" | "alpha" }[] = [
  { id: "aisle", label: "Category", key: (p) => p.aisle, order: "count" },
  { id: "brand", label: "Brand", key: (p) => p.brand, order: "count" },
  { id: "pack", label: "Pack", key: (p) => p.pack, order: "size" },
  { id: "volume", label: "Size", key: (p) => p.volume, order: "size" },
  { id: "country", label: "Country", key: (p) => p.country, order: "count" },
  { id: "varietal", label: "Varietal / style", key: (p) => p.varietal, order: "count" },
];

/** Filter, then compute facet counts as if that facet's own selection were cleared. */
export function runListing(products: Product[], p: ListingParams, aisleNames: Record<string, string>, opts: { searchOrder?: Map<number, number>; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const minC = p.min == null ? null : Math.round(p.min * 100), maxC = p.max == null ? null : Math.round(p.max * 100);
  const match = (x: Product, skip?: FacetId) => {
    for (const f of FACETS) if (f.id !== skip && p[f.id].length) { const k = f.key(x); if (k == null || !p[f.id].includes(k)) return false; }
    if (p.inStock && !((x.quantity ?? 0) > 0)) return false;
    if (minC != null || maxC != null) { const c = priceNow(x, now); if (c == null || (minC != null && c < minC) || (maxC != null && c > maxC)) return false; }
    return true;
  };

  const facets: FacetOut[] = FACETS.map((f) => {
    const counts = new Map<string, number>();
    for (const x of products) if (match(x, f.id)) { const k = f.key(x); if (k) counts.set(k, (counts.get(k) ?? 0) + 1); }
    for (const sel of p[f.id]) if (!counts.has(sel)) counts.set(sel, 0);
    const options = [...counts].map(([value, count]) => ({ value, label: f.id === "aisle" ? aisleNames[value] ?? value : value, count }));
    options.sort(f.order === "size" ? (a, b) => sizeOrder(a.value) - sizeOrder(b.value) || b.count - a.count : f.order === "alpha" ? (a, b) => a.label.localeCompare(b.label) : (a, b) => b.count - a.count);
    return { id: f.id, label: f.label, options };
  }).filter((f) => f.options.length > 1 || f.options.some((o) => p[f.id].includes(o.value)));

  let rows = products.filter((x) => match(x));
  if (p.sort === "name-asc") rows = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
  else if (p.sort === "price-asc" || p.sort === "price-desc") {
    const dir = p.sort === "price-asc" ? 1 : -1;
    rows = rows.slice().sort((a, b) => { const x = priceNow(a, now), y = priceNow(b, now); return x == null ? 1 : y == null ? -1 : (x - y) * dir; });
  } else if (p.sort === "newest") rows = rows.slice().sort((a, b) => Date.parse(b.createdAt ?? "0") - Date.parse(a.createdAt ?? "0"));
  else if (opts.searchOrder) rows = rows.slice().sort((a, b) => (opts.searchOrder!.get(a.id) ?? 1e9) - (opts.searchOrder!.get(b.id) ?? 1e9));
  else rows = rows.slice().sort((a, b) => a.rank - b.rank);

  return { total: rows.length, shown: rows.slice(0, p.page * PAGE_SIZE), facets };
}
