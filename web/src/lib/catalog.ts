import "server-only";
import data from "@/data/catalog.json";
import type { ProductSummary } from "./types";

/*
  Catalog access for every page. Today it reads src/data/catalog.json (from the one-time
  Bottle POS export); Phase 3 swaps this module's internals for the database.
  The export has no prices, stock, brands or images, so those fields are null and the
  UI shows "Call for price" and no stock badge rather than guessing.
*/
export type ArtInput = { id: number; name: string; dept: string; aisle: string; shape: string; body: string; ink: string; flv: string };
export type Product = ProductSummary & {
  id: number; rank: number; dept: string; aisle: string; pack: string | null; volume: string | null;
  gameDay: boolean; note?: string; art: ArtInput;
};
export type Aisle = { slug: string; name: string; count: number };
export type Department = { slug: string; name: string; count: number; children: Aisle[] };

type Raw = (typeof data)["products"][number] & { note?: string };

const PRODUCTS: Product[] = (data.products as Raw[]).map((r) => ({
  id: r.id, slug: r.slug, name: r.name, rank: r.rank, dept: r.dept, aisle: r.aisle,
  pack: r.pack, volume: r.volume, gameDay: r.gameDay, note: r.note,
  size: [r.pack, r.volume].filter(Boolean).join(", ") || null,
  brand: null, image: null, price: { regularCents: null }, quantity: null,
  category: r.art.aisle,
  art: { id: r.id, name: r.name, ...r.art },
}));
const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));
const DEPTS: Department[] = data.categories;

export const departments = () => DEPTS;
export const department = (slug: string) => DEPTS.find((d) => d.slug === slug);
export const aisle = (dept: string, slug: string) => department(dept)?.children.find((a) => a.slug === slug);
export const product = (slug: string) => BY_SLUG.get(slug);
export const allProducts = () => PRODUCTS;
export const catalogSource = data.source;

export function productsIn(dept?: string, aisleSlug?: string) {
  return PRODUCTS.filter((p) => (!dept || p.dept === dept) && (!aisleSlug || p.aisle === aisleSlug));
}

/** Products in the same aisle, closest in the store's ranking. */
export function related(p: Product, n = 8) {
  return PRODUCTS.filter((x) => x.aisle === p.aisle && x.id !== p.id).sort((a, b) => Math.abs(a.rank - p.rank) - Math.abs(b.rank - p.rank)).slice(0, n);
}

/** Department → aisle tree for the mega menu and breadcrumbs. */
export function categoryTree() {
  return DEPTS.map((d) => ({
    name: d.name, href: `/c/${d.slug}`,
    children: d.children.map((a) => ({ name: a.name, href: `/c/${d.slug}/${a.slug}` })),
  }));
}

/** Strip a product to what a card needs, so client components never receive the whole record. */
export const toCard = (p: Product) => ({ slug: p.slug, name: p.name, size: p.size, brand: p.brand, image: p.image, price: p.price, quantity: p.quantity, art: p.art });
export type CardProduct = ReturnType<typeof toCard>;
