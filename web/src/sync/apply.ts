import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { brands, catalogState, categories, prices, products, slugRedirects, stock, syncRuns, variants } from "@/db/schema";
import { slugify } from "@/lib/slug";
import type { PosItem, PosUpdate, SyncResult } from "./types";

/** Site department slugs are short and fixed; other names are slugified. */
const DEPT_SLUGS: Record<string, string> = {
  "Beer & Seltzers": "beer", "Wine": "wine", "Spirits": "spirits", "Soft Drinks & Water": "soft-drinks", "Grocery": "grocery",
};
export const deptSlug = (name: string) => DEPT_SLUGS[name] ?? slugify(name);

const iso = (v: string | null | undefined) => (v ? new Date(v.length === 10 ? `${v}T00:00:00-05:00` : v) : null);
/** Equality that ignores object key order (Postgres jsonb reorders keys). */
const stable = (v: unknown): unknown => (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])])) : v);
const same = (a: unknown, b: unknown) => JSON.stringify(stable(a ?? null)) === JSON.stringify(stable(b ?? null));
const CHUNK = 500;

type Options = { source: string; kind: "full" | "webhook"; allowMassDeactivate?: boolean };

/** A full sync may hide at most this share of the active catalog (and at least 25 items) in one
    run. A truncated or empty POS export would otherwise empty the live site while reporting "ok". */
export const MAX_DEACTIVATE_SHARE = 0.2;

/**
 * Applies items from the point of sale to the database in one transaction.
 *  - full sync: every active item is in `items`; products missing from the feed are deactivated (never deleted).
 *    If that would hide more than MAX_DEACTIVATE_SHARE of the catalog, nothing is applied and the
 *    run fails, unless allowMassDeactivate is set (after a person has checked the feed).
 *  - webhook: `items` are partial updates matched by sku; unknown skus are created only if they carry
 *    name, department and aisle, otherwise reported back.
 * Only rows that actually changed are written. A renamed product gets a new slug and its old slug 301s.
 */
export async function applyItems(db: Db, items: (PosItem | PosUpdate)[], opts: Options): Promise<SyncResult> {
  const [run] = await db.insert(syncRuns).values({ source: opts.source, kind: opts.kind, itemsSeen: items.length }).returning({ id: syncRuns.id });
  const runId = run!.id;
  try {
    const result = await db.transaction(async (tx) => {
      const r: SyncResult = { runId, created: 0, updated: 0, deactivated: 0, unchanged: 0, unknownSkus: [], changedSlugs: [], changedDepartments: [] };
      const depts = new Set<string>();

      // ---- categories (department → aisle) ----
      const cats = await tx.select().from(categories);
      const catKey = (parentId: number | null, slug: string) => `${parentId ?? 0}:${slug}`;
      const catByKey = new Map(cats.map((c) => [catKey(c.parentId, c.slug), c]));
      const catById = new Map(cats.map((c) => [c.id, c]));
      const ensureCat = async (name: string, parentId: number | null) => {
        const slug = parentId == null ? deptSlug(name) : slugify(name);
        const hit = catByKey.get(catKey(parentId, slug));
        if (hit) return hit.id;
        const [row] = await tx.insert(categories).values({ name, slug, parentId, depth: parentId == null ? 0 : 1 }).returning();
        catByKey.set(catKey(parentId, slug), row!); catById.set(row!.id, row!);
        return row!.id;
      };
      const aisleId = async (dept: string, aisle: string) => ensureCat(aisle, await ensureCat(dept, null));
      const deptOfAisle = (id: number) => { const a = catById.get(id); return a?.parentId ? catById.get(a.parentId)!.slug : a?.slug ?? ""; };

      // ---- brands ----
      const brandRows = await tx.select().from(brands);
      const brandBySlug = new Map(brandRows.map((b) => [b.slug, b.id]));
      const brandId = async (name: string | null | undefined) => {
        if (!name) return null;
        const slug = slugify(name);
        if (!slug) return null;
        const hit = brandBySlug.get(slug);
        if (hit) return hit;
        const [row] = await tx.insert(brands).values({ name, slug }).returning({ id: brands.id });
        brandBySlug.set(slug, row!.id);
        return row!.id;
      };

      // ---- current state, keyed by sku ----
      const current = await tx.select({
        variantId: variants.id, sku: variants.sku, productId: variants.productId, upc: variants.upc, pack: variants.pack, volume: variants.volume, vActive: variants.active,
        slug: products.slug, name: products.name, brandId: products.brandId, categoryId: products.categoryId, description: products.description, abv: products.abv,
        country: products.country, region: products.region, varietal: products.varietal, rank: products.rank, gameDay: products.gameDay, art: products.art, note: products.note, active: products.active,
        regularCents: prices.regularCents, saleCents: prices.saleCents, saleStartsAt: prices.saleStartsAt, saleEndsAt: prices.saleEndsAt, quantity: stock.quantity,
      }).from(variants).innerJoin(products, eq(products.id, variants.productId))
        .leftJoin(prices, eq(prices.variantId, variants.id)).leftJoin(stock, eq(stock.variantId, variants.id));
      const bySku = new Map(current.map((c) => [c.sku, c]));
      const slugs = new Set((await tx.select({ s: products.slug }).from(products)).map((x) => x.s));
      for (const s of (await tx.select({ s: slugRedirects.fromSlug }).from(slugRedirects))) slugs.add(s.s);
      const uniqueSlug = (name: string) => {
        const base = slugify(name) || "item";
        let s = base, n = 2;
        while (slugs.has(s)) s = `${base}-${n++}`;
        slugs.add(s);
        return s;
      };

      const seen = new Set<string>();
      const toCreate: { item: PosItem; categoryId: number; brandId: number | null }[] = [];
      const now = new Date();

      for (const item of items) {
        seen.add(item.sku);
        const ex = bySku.get(item.sku);
        if (!ex) {
          if (!item.name || !item.department || !item.aisle) { r.unknownSkus.push(item.sku); continue; }
          const full = item as PosItem;
          toCreate.push({ item: full, categoryId: await aisleId(full.department, full.aisle), brandId: await brandId(full.brand) });
          continue;
        }
        // Merge: fields absent from a partial update keep their current value.
        const has = <K extends keyof PosItem>(k: K) => k in item && (item as PosItem)[k] !== undefined;
        const categoryId = has("department") && has("aisle") ? await aisleId(item.department!, item.aisle!) : ex.categoryId;
        const bId = has("brand") ? await brandId(item.brand) : ex.brandId;
        const p = {
          name: item.name ?? ex.name, brandId: bId, categoryId,
          description: has("description") ? item.description ?? null : ex.description,
          abv: has("abv") ? (item.abv == null ? null : item.abv.toFixed(1)) : ex.abv,
          country: has("country") ? item.country ?? null : ex.country,
          region: has("region") ? item.region ?? null : ex.region,
          varietal: has("varietal") ? item.varietal ?? null : ex.varietal,
          rank: item.rank ?? ex.rank, gameDay: item.gameDay ?? ex.gameDay,
          art: has("art") ? item.art ?? null : ex.art, note: has("note") ? item.note ?? null : ex.note,
          active: item.active ?? (opts.kind === "full" ? true : ex.active),
        };
        const v = { upc: has("upc") ? item.upc ?? null : ex.upc, pack: has("pack") ? item.pack ?? null : ex.pack, volume: has("volume") ? item.volume ?? null : ex.volume, active: p.active };
        const pr = {
          regularCents: has("priceCents") ? item.priceCents ?? null : ex.regularCents ?? null,
          saleCents: has("saleCents") ? item.saleCents ?? null : ex.saleCents ?? null,
          saleStartsAt: has("saleStartsAt") ? iso(item.saleStartsAt) : ex.saleStartsAt ?? null,
          saleEndsAt: has("saleEndsAt") ? iso(item.saleEndsAt) : ex.saleEndsAt ?? null,
        };
        const qty = has("quantity") ? item.quantity ?? null : ex.quantity ?? null;

        const prodChanged = (Object.keys(p) as (keyof typeof p)[]).some((k) => !same(p[k], ex[k]));
        const varChanged = !same(v.upc, ex.upc) || !same(v.pack, ex.pack) || !same(v.volume, ex.volume) || v.active !== ex.vActive;
        const priceChanged = !same(pr.regularCents, ex.regularCents) || !same(pr.saleCents, ex.saleCents) || !same(pr.saleStartsAt?.toISOString(), ex.saleStartsAt?.toISOString()) || !same(pr.saleEndsAt?.toISOString(), ex.saleEndsAt?.toISOString());
        const stockChanged = !same(qty, ex.quantity);
        if (!prodChanged && !varChanged && !priceChanged && !stockChanged) { r.unchanged++; continue; }

        let slug = ex.slug;
        if (prodChanged) {
          if (p.name !== ex.name) {
            slug = uniqueSlug(p.name);
            await tx.insert(slugRedirects).values({ fromSlug: ex.slug, productId: ex.productId }).onConflictDoUpdate({ target: slugRedirects.fromSlug, set: { productId: ex.productId } });
          }
          await tx.update(products).set({ ...p, slug, updatedAt: now }).where(eq(products.id, ex.productId));
        }
        if (varChanged) await tx.update(variants).set(v).where(eq(variants.id, ex.variantId));
        if (priceChanged) await tx.insert(prices).values({ variantId: ex.variantId, ...pr, updatedAt: now }).onConflictDoUpdate({ target: prices.variantId, set: { ...pr, updatedAt: now } });
        if (stockChanged) await tx.insert(stock).values({ variantId: ex.variantId, quantity: qty, updatedAt: now }).onConflictDoUpdate({ target: stock.variantId, set: { quantity: qty, updatedAt: now } });
        r.updated++;
        r.changedSlugs.push(slug);
        if (slug !== ex.slug) r.changedSlugs.push(ex.slug);
        depts.add(deptOfAisle(categoryId));
        if (categoryId !== ex.categoryId) depts.add(deptOfAisle(ex.categoryId));
      }

      // ---- batched creates ----
      for (let i = 0; i < toCreate.length; i += CHUNK) {
        const chunk = toCreate.slice(i, i + CHUNK);
        const rows = await tx.insert(products).values(chunk.map(({ item, categoryId, brandId: b }) => ({
          slug: uniqueSlug(item.name), name: item.name, brandId: b, categoryId, description: item.description ?? null,
          abv: item.abv == null ? null : item.abv.toFixed(1), country: item.country ?? null, region: item.region ?? null,
          varietal: item.varietal ?? null, rank: item.rank ?? 100000, gameDay: item.gameDay ?? false, art: item.art ?? null,
          note: item.note ?? null, active: item.active ?? true,
        }))).returning({ id: products.id, slug: products.slug, categoryId: products.categoryId });
        const vrows = await tx.insert(variants).values(chunk.map(({ item }, j) => ({
          productId: rows[j]!.id, sku: item.sku, upc: item.upc ?? null, pack: item.pack ?? null, volume: item.volume ?? null, active: item.active ?? true,
        }))).returning({ id: variants.id });
        await tx.insert(prices).values(chunk.map(({ item }, j) => ({
          variantId: vrows[j]!.id, regularCents: item.priceCents ?? null, saleCents: item.saleCents ?? null,
          saleStartsAt: iso(item.saleStartsAt), saleEndsAt: iso(item.saleEndsAt),
        })));
        await tx.insert(stock).values(chunk.map(({ item }, j) => ({ variantId: vrows[j]!.id, quantity: item.quantity ?? null })));
        r.created += rows.length;
        for (const row of rows) { r.changedSlugs.push(row.slug); depts.add(deptOfAisle(row.categoryId)); }
      }

      // ---- full sync: hide what's no longer sold ----
      if (opts.kind === "full") {
        const gone = current.filter((c) => !seen.has(c.sku) && c.active).map((c) => c.productId);
        const active = current.filter((c) => c.active).length;
        const limit = Math.max(25, Math.floor(active * MAX_DEACTIVATE_SHARE));
        if (gone.length > limit && !opts.allowMassDeactivate) {
          throw new Error(`Refusing to hide ${gone.length} of ${active} products (limit ${limit}). The feed may be incomplete; nothing was changed. If this is intended, rerun with --allow-mass-deactivate.`);
        }
        for (let i = 0; i < gone.length; i += CHUNK) {
          const ids = gone.slice(i, i + CHUNK);
          await tx.update(products).set({ active: false, updatedAt: now }).where(and(inArray(products.id, ids), eq(products.active, true)));
        }
        r.deactivated = gone.length;
        for (const c of current.filter((c) => !seen.has(c.sku) && c.active)) { r.changedSlugs.push(c.slug); depts.add(deptOfAisle(c.categoryId)); }
      }

      if (r.created || r.updated || r.deactivated) {
        await tx.insert(catalogState).values({ id: 1, version: 1 }).onConflictDoUpdate({ target: catalogState.id, set: { version: sql`${catalogState.version} + 1`, updatedAt: now } });
      }
      r.changedDepartments = [...depts].filter(Boolean);
      return r;
    });
    await db.update(syncRuns).set({ status: "ok", finishedAt: new Date(), created: result.created, updated: result.updated, deactivated: result.deactivated }).where(eq(syncRuns.id, runId));
    return result;
  } catch (e) {
    await db.update(syncRuns).set({ status: "failed", finishedAt: new Date(), error: String((e as Error).message ?? e).slice(0, 2000) }).where(eq(syncRuns.id, runId));
    throw e;
  }
}
