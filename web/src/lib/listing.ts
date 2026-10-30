import type { Product } from "./catalog";

/* Listing state lives in the URL: ?aisle=a,b&pack=12+pk&volume=12+oz&sort=name-asc&page=2 */
export const PAGE_SIZE = 36;
export type Sort = "relevance" | "name-asc" | "price-asc" | "price-desc" | "newest";
export type ListingParams = { aisle: string[]; pack: string[]; volume: string[]; sort: Sort; page: number; inStock: boolean };
type SP = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(",") : v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function parseParams(sp: SP, available: Sort[]): ListingParams {
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as Sort;
  const page = Math.max(1, Math.min(500, parseInt(String(sp.page ?? "1"), 10) || 1));
  return { aisle: list(sp.aisle), pack: list(sp.pack), volume: list(sp.volume), sort: available.includes(sort) ? sort : "relevance", page, inStock: sp.stock === "in" };
}

/** Which sorts make sense for the data we actually have. */
export function availableSorts(products: Product[]): Sort[] {
  const s: Sort[] = ["relevance", "name-asc"];
  if (products.some((p) => p.price.regularCents != null)) s.push("price-asc", "price-desc");
  return s;
}

const sizeOrder = (v: string) => {
  const m = v.match(/([\d.]+)\s*(pk|oz|ml|L|lb|gal|qt|pt|ct)/);
  if (!m) return 1e9;
  return parseFloat(m[1]!) * ({ pk: 1, ml: 1, L: 1000, oz: 29.57, lb: 454, gal: 3785, qt: 946, pt: 473, ct: 1 } as Record<string, number>)[m[2]!]!;
};

export type FacetOut = { id: "aisle" | "pack" | "volume"; label: string; options: { value: string; label: string; count: number }[] };

/** Filter, then compute facet counts as if that facet's own selection were cleared. */
export function runListing(products: Product[], p: ListingParams, aisleNames: Record<string, string>, opts: { searchOrder?: Map<number, number> } = {}) {
  const match = (x: Product, skip?: string) =>
    (skip === "aisle" || !p.aisle.length || p.aisle.includes(x.aisle)) &&
    (skip === "pack" || !p.pack.length || (x.pack != null && p.pack.includes(x.pack))) &&
    (skip === "volume" || !p.volume.length || (x.volume != null && p.volume.includes(x.volume))) &&
    (!p.inStock || (x.quantity ?? 0) > 0);

  const facet = (id: FacetOut["id"], label: string, key: (x: Product) => string | null, labelOf: (v: string) => string, order: (a: string, b: string) => number): FacetOut => {
    const counts = new Map<string, number>();
    for (const x of products) if (match(x, id)) { const k = key(x); if (k) counts.set(k, (counts.get(k) ?? 0) + 1); }
    for (const sel of p[id]) if (!counts.has(sel)) counts.set(sel, 0);
    return { id, label, options: [...counts].map(([value, count]) => ({ value, label: labelOf(value), count })).sort((a, b) => order(a.value, b.value) || b.count - a.count) };
  };

  const facets = [
    facet("aisle", "Category", (x) => x.aisle, (v) => aisleNames[v] ?? v, () => 0),
    facet("pack", "Pack", (x) => x.pack, (v) => v, (a, b) => sizeOrder(a) - sizeOrder(b)),
    facet("volume", "Size", (x) => x.volume, (v) => v, (a, b) => sizeOrder(a) - sizeOrder(b)),
  ].map((f) => (f.id === "aisle" ? { ...f, options: f.options.sort((a, b) => b.count - a.count) } : f))
   .filter((f) => f.options.length > 1 || f.options.some((o) => p[f.id].includes(o.value)));

  let rows = products.filter((x) => match(x));
  if (p.sort === "name-asc") rows = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
  else if (p.sort === "price-asc" || p.sort === "price-desc") {
    const dir = p.sort === "price-asc" ? 1 : -1;
    rows = rows.slice().sort((a, b) => ((a.price.regularCents ?? Infinity) - (b.price.regularCents ?? Infinity)) * dir);
  } else if (opts.searchOrder) rows = rows.slice().sort((a, b) => (opts.searchOrder!.get(a.id) ?? 1e9) - (opts.searchOrder!.get(b.id) ?? 1e9));
  else rows = rows.slice().sort((a, b) => a.rank - b.rank);

  return { total: rows.length, shown: rows.slice(0, p.page * PAGE_SIZE), facets };
}

/** Build a URL for the listing with some params changed. Resets paging unless `page` is given. */
export function listingHref(path: string, p: ListingParams, change: Partial<ListingParams> & { q?: string }) {
  const n = { ...p, page: 1, ...change };
  const u = new URLSearchParams();
  if (change.q ?? "") u.set("q", change.q!);
  if (n.aisle.length) u.set("aisle", n.aisle.join(","));
  if (n.pack.length) u.set("pack", n.pack.join(","));
  if (n.volume.length) u.set("volume", n.volume.join(","));
  if (n.inStock) u.set("stock", "in");
  if (n.sort !== "relevance") u.set("sort", n.sort);
  if (n.page > 1) u.set("page", String(n.page));
  const qs = u.toString();
  return qs ? `${path}?${qs}` : path;
}
