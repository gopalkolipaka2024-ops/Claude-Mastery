/* Story fixtures. Product names and categories come from the store's catalog
   (catalog.js). PRICES AND STOCK HERE ARE EXAMPLES for documenting component states
   only; the live site shows prices and stock solely from the store's own data. */
import type { CategoryNode, ProductSummary } from "@/lib/types";
import type { SuggestionGroups } from "@/components/SearchBox";
import { store } from "@/config/store";

export const products: ProductSummary[] = [
  { slug: "coors-light-30-pk", name: "Coors Light 30 pk", brand: "Coors", size: "30 pk, 12 oz cans", category: "Light beer", price: { regularCents: 2899 }, quantity: 40, image: { src: "/examples/example-pack.svg", alt: "Example pack image", width: 260, height: 320 } },
  { slug: "miller-lite-18-pk-cans", name: "Miller Lite 18 pk Cans", brand: "Miller", size: "18 pk, 12 oz cans", category: "Light beer", price: { regularCents: 1999, saleCents: 1749, saleEndsAt: "2099-12-31" }, quantity: 3, image: null },
  { slug: "sutter-home-cabernet", name: "Sutter Home Cabernet", brand: "Sutter Home", size: "750 ml", category: "Red wine", price: { regularCents: 899 }, quantity: 0, image: { src: "/examples/example-front.svg", alt: "Example bottle image", width: 260, height: 320 } },
  { slug: "poland-spring-24-pk", name: "Poland Spring 24 pk", brand: "Poland Spring", size: "24 pk, 16.9 oz", category: "Water", price: { regularCents: null }, quantity: null, image: null },
];

export const categories: CategoryNode[] = [
  { name: "Beer & Seltzers", href: "/c/beer", children: [
    { name: "Light beer", href: "/c/beer/light-beer", children: [
      { name: "Coors Light", href: "/c/beer/light-beer?brand=coors-light" }, { name: "Miller Lite", href: "/c/beer/light-beer?brand=miller-lite" },
      { name: "Bud Light", href: "/c/beer/light-beer?brand=bud-light" }, { name: "Michelob Ultra", href: "/c/beer/light-beer?brand=michelob-ultra" } ] },
    { name: "IPA and pale ale", href: "/c/beer/ipa-and-pale-ale" },
    { name: "Imported", href: "/c/beer/imported" },
    { name: "Seltzers, ciders and cocktails", href: "/c/beer/seltzers-ciders-and-cocktails" },
    { name: "Non-alcoholic", href: "/c/beer/non-alcoholic" } ] },
  { name: "Wine", href: "/c/wine", children: [
    { name: "Red", href: "/c/wine/red" }, { name: "White", href: "/c/wine/white" }, { name: "Rosé", href: "/c/wine/rose" }, { name: "Sparkling", href: "/c/wine/sparkling" } ] },
  { name: "Spirits", href: "/c/spirits", children: [
    { name: "Whiskey and bourbon", href: "/c/spirits/whiskey-and-bourbon" }, { name: "Vodka", href: "/c/spirits/vodka" },
    { name: "Tequila and mezcal", href: "/c/spirits/tequila-and-mezcal" }, { name: "Rum", href: "/c/spirits/rum" } ] },
  { name: "Soft Drinks & Water", href: "/c/soft-drinks", children: [
    { name: "Soda", href: "/c/soft-drinks/soda" }, { name: "Water, seltzer and ice", href: "/c/soft-drinks/water-seltzer-and-ice" }, { name: "Energy and sports", href: "/c/soft-drinks/energy-and-sports" } ] },
  { name: "Grocery", href: "/c/grocery", children: [
    { name: "Snacks and chips", href: "/c/grocery/snacks-and-chips" }, { name: "Candy and chocolate", href: "/c/grocery/candy-and-chocolate" },
    { name: "Dairy and eggs", href: "/c/grocery/dairy-and-eggs" }, { name: "Household and personal care", href: "/c/grocery/household-and-personal-care" } ] },
  { name: "Deals", href: "/deals" },
];

export const facets = [
  { id: "category", label: "Category", options: [{ value: "light-beer", label: "Light beer", count: 70 }, { value: "domestic-lager", label: "Domestic lager", count: 61 }, { value: "imported", label: "Imported", count: 92 }, { value: "non-alcoholic", label: "Non-alcoholic", count: 0 }] },
  { id: "size", label: "Size", options: ["6 pk", "12 pk", "18 pk", "24 pk", "30 pk", "4 pk", "8 pk", "15 pk", "36 pk", "Single"].map((v, i) => ({ value: v, label: v, count: [212, 188, 34, 22, 9, 120, 15, 6, 2, 80][i]! })) },
];

const ALL: { label: string; href: string; meta?: string; kind: keyof SuggestionGroups }[] = [
  ...categories.flatMap((c) => [{ label: c.name, href: c.href, kind: "categories" as const }, ...(c.children ?? []).map((s) => ({ label: s.name, href: s.href, meta: c.name, kind: "categories" as const }))]),
  ...["Coors", "Miller", "Michelob", "Sutter Home", "Poland Spring", "Corona", "White Claw"].map((b) => ({ label: b, href: `/brand/${b.toLowerCase().replace(/\s+/g, "-")}`, kind: "brands" as const })),
  ...products.map((p) => ({ label: p.name, href: `/p/${p.slug}`, meta: p.size ?? undefined, kind: "products" as const })),
];

/** A tiny in-memory search used by stories. The real index (typo tolerance, synonyms) comes in Phase 2. */
export async function exampleSearch(q: string, { delay = 80, fail = false } = {}): Promise<SuggestionGroups> {
  await new Promise((r) => setTimeout(r, delay));
  if (fail) throw new Error("offline");
  const t = q.toLowerCase();
  const hit = ALL.filter((x) => x.label.toLowerCase().includes(t));
  const pick = (k: keyof SuggestionGroups) => hit.filter((x) => x.kind === k).slice(0, 5).map(({ label, href, meta }) => ({ label, href, meta }));
  return { products: pick("products"), brands: pick("brands"), categories: pick("categories") };
}

export const storeHours = { week: [...store.hours], timeZone: store.timeZone };
/** Fixed clock so "open/closed" stories render the same every time. */
export const OPEN_TIME = new Date("2026-10-30T15:00:00-04:00");
export const CLOSED_TIME = new Date("2026-10-30T23:30:00-04:00");
