import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PosItem } from "../types";

/**
 * The one-time Bottle POS export we have today (already cleaned into src/data/catalog.json).
 * It has no SKUs, so the item name stands in as the key until a real export with item IDs arrives.
 */
export function catalogExportItems(file = resolve(process.cwd(), "src/data/catalog.json")): PosItem[] {
  const data = JSON.parse(readFileSync(file, "utf8")) as {
    categories: { slug: string; name: string; children: { slug: string; name: string }[] }[];
    products: { name: string; slug: string; rank: number; dept: string; aisle: string; pack: string | null; volume: string | null; gameDay: boolean; note?: string; art: { dept: string; aisle: string; shape: string; body: string; ink: string; flv: string } }[];
  };
  const deptName = Object.fromEntries(data.categories.map((c) => [c.slug, c.name]));
  return data.products.map((p) => ({
    sku: `name:${p.slug}`, name: p.name, department: deptName[p.dept] ?? p.dept, aisle: p.art.aisle,
    pack: p.pack, volume: p.volume, rank: p.rank, gameDay: p.gameDay, note: p.note ?? null, art: p.art,
  }));
}
