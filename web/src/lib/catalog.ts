import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasDatabase } from "@/db/client";
import type { Price, ProductImage } from "./types";

/*
  Catalog access for every page and API. One in-memory snapshot of the active catalog,
  loaded from Postgres when DATABASE_URL is set (otherwise from src/data/catalog.json, read from
  disk so the 2 MB file isn't bundled into the Cloudflare Worker, which always has a database).
  The snapshot reloads when the database's catalog version changes (a one-row check, at most
  every 2 seconds), or immediately after a sync/admin change in this process. It lives on
  globalThis because Next.js bundles each route separately; one shared copy per process means
  a webhook's invalidation reaches every page. At ~7,400 products this keeps pages fast and
  the database nearly idle.
*/
export type ArtInput = { id: number; name: string; dept: string; aisle: string; shape: string; body: string; ink: string; flv: string };
export type Product = {
  id: number; slug: string; name: string; rank: number;
  dept: string; aisle: string; category: string; // dept/aisle are slugs; category is the aisle's name
  brand: string | null; size: string | null; pack: string | null; volume: string | null; upc: string | null;
  price: Price; quantity: number | null; image: ProductImage | null;
  description: string | null; abv: number | null; country: string | null; region: string | null; varietal: string | null;
  gameDay: boolean; note?: string | null; art: ArtInput; createdAt: string | null; updatedAt: string | null;
};
export type Aisle = { slug: string; name: string; count: number };
export type Department = { slug: string; name: string; count: number; children: Aisle[] };
export type Snapshot = { version: number; source: string; products: Product[]; departments: Department[]; redirects: Map<string, string> };

/* ---------- JSON source (no database configured) ---------- */
type RawProduct = { id: number; slug: string; name: string; rank: number; dept: string; aisle: string; pack: string | null; volume: string | null; gameDay: boolean; note?: string; art: Omit<ArtInput, "id" | "name"> };
type RawCatalog = { source: string; categories: Department[]; products: RawProduct[] };
let jsonSnap: Snapshot | null = null;
function fromJson(): Snapshot {
  if (jsonSnap) return jsonSnap;
  const data = JSON.parse(readFileSync(join(process.cwd(), "src/data/catalog.json"), "utf8")) as RawCatalog;
  const products: Product[] = data.products.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, rank: r.rank, dept: r.dept, aisle: r.aisle, category: r.art.aisle,
    brand: null, size: [r.pack, r.volume].filter(Boolean).join(", ") || null, pack: r.pack, volume: r.volume, upc: null,
    price: { regularCents: null }, quantity: null, image: null,
    description: null, abv: null, country: null, region: null, varietal: null,
    gameDay: r.gameDay, note: r.note ?? null, art: { id: r.id, name: r.name, ...r.art }, createdAt: null, updatedAt: null,
  }));
  jsonSnap = { version: 0, source: data.source, products, departments: data.categories, redirects: new Map() };
  return jsonSnap;
}

/* ---------- Postgres source ---------- */
const g = globalThis as unknown as { __asmCatalog?: { snap: Promise<Snapshot> | null; checkedAt: number } };
const state = (g.__asmCatalog ??= { snap: null, checkedAt: 0 });
async function fromDb(): Promise<Snapshot> {
  const { loadSnapshot, catalogVersion } = await import("./catalog-pg");
  if (!state.snap) { state.snap = loadSnapshot(); state.checkedAt = Date.now(); }
  else if (Date.now() - state.checkedAt > 2_000) {
    state.checkedAt = Date.now();
    const [cur, v] = await Promise.all([state.snap, catalogVersion().catch(() => null)]);
    if (v != null && v !== cur.version) state.snap = loadSnapshot();
  }
  try { return await state.snap; } catch (e) { state.snap = null; throw e; }
}

/** Drop the cached snapshot (after a sync or admin change in this process). */
export function invalidateCatalog() { state.snap = null; }

export async function getCatalog() {
  const s = hasDatabase() ? await fromDb() : fromJson();
  const bySlug = new Map(s.products.map((p) => [p.slug, p]));
  const byId = new Map(s.products.map((p) => [p.id, p]));
  const deptBy = new Map(s.departments.map((d) => [d.slug, d]));
  return {
    version: s.version,
    source: s.source,
    departments: () => s.departments,
    department: (slug: string) => deptBy.get(slug),
    aisle: (dept: string, slug: string) => deptBy.get(dept)?.children.find((a) => a.slug === slug),
    product: (slug: string) => bySlug.get(slug),
    productById: (id: number) => byId.get(id),
    /** New slug for a product that was renamed, so old links 301. */
    redirect: (slug: string) => s.redirects.get(slug) ?? null,
    all: () => s.products,
    productsIn: (dept?: string, aisle?: string) => s.products.filter((p) => (!dept || p.dept === dept) && (!aisle || p.aisle === aisle)),
    /** Products in the same aisle, closest in the store's ranking. */
    related: (p: Product, n = 8) => s.products.filter((x) => x.aisle === p.aisle && x.id !== p.id).sort((a, b) => Math.abs(a.rank - p.rank) - Math.abs(b.rank - p.rank)).slice(0, n),
    /** Same brand, when the data has brands. */
    sameBrand: (p: Product, n = 8) => (p.brand ? s.products.filter((x) => x.brand === p.brand && x.id !== p.id).slice(0, n) : []),
    /** Department → aisle tree for the mega menu. */
    categoryTree: () => s.departments.map((d) => ({ name: d.name, href: `/c/${d.slug}`, children: d.children.map((a) => ({ name: a.name, href: `/c/${d.slug}/${a.slug}` })) })),
  };
}
export type Catalog = Awaited<ReturnType<typeof getCatalog>>;
