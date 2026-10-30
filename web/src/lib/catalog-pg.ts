import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brands, catalogState, categories, images, prices, products, slugRedirects, stock, variants } from "@/db/schema";
import type { Department, Product, Snapshot } from "./catalog";

/** Current catalog version; bumped by every sync that changes something. */
export async function catalogVersion() {
  const [row] = await db().select({ v: catalogState.version }).from(catalogState).where(eq(catalogState.id, 1));
  return row?.v ?? 0;
}

/** Loads every active product with its first variant, price, stock and first image in one query. */
export async function loadSnapshot(): Promise<Snapshot> {
  const d = db();
  const dept = alias(categories, "dept");
  const firstImage = d.$with("first_image").as(
    d.selectDistinctOn([images.productId], { productId: images.productId, url: images.url, alt: images.alt, width: images.width, height: images.height, blur: images.blur })
      .from(images).orderBy(images.productId, asc(images.position)),
  );
  const [version, rows, cats, redirects] = await Promise.all([
    catalogVersion(),
    d.with(firstImage).select({
      id: products.id, slug: products.slug, name: products.name, rank: products.rank, description: products.description,
      abv: products.abv, country: products.country, region: products.region, varietal: products.varietal,
      gameDay: products.gameDay, note: products.note, art: products.art, createdAt: products.createdAt, updatedAt: products.updatedAt,
      aisleSlug: categories.slug, aisleName: categories.name, deptSlug: dept.slug, brand: brands.name,
      upc: variants.upc, pack: variants.pack, volume: variants.volume,
      regularCents: prices.regularCents, saleCents: prices.saleCents, saleStartsAt: prices.saleStartsAt, saleEndsAt: prices.saleEndsAt, priceUpdated: prices.updatedAt,
      quantity: stock.quantity, stockUpdated: stock.updatedAt,
      imgUrl: firstImage.url, imgAlt: firstImage.alt, imgW: firstImage.width, imgH: firstImage.height, imgBlur: firstImage.blur,
    }).from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .innerJoin(dept, eq(dept.id, categories.parentId))
      .innerJoin(variants, and(eq(variants.productId, products.id), eq(variants.position, 0)))
      .leftJoin(prices, eq(prices.variantId, variants.id))
      .leftJoin(stock, eq(stock.variantId, variants.id))
      .leftJoin(brands, eq(brands.id, products.brandId))
      .leftJoin(firstImage, eq(firstImage.productId, products.id))
      .where(eq(products.active, true))
      .orderBy(asc(products.rank), asc(products.id)),
    d.select().from(categories).orderBy(asc(categories.position)),
    d.select({ from: slugRedirects.fromSlug, to: products.slug }).from(slugRedirects).innerJoin(products, eq(products.id, slugRedirects.productId)),
  ]);

  const iso = (v: Date | null) => (v ? v.toISOString() : null);
  const latest = (...v: (Date | null)[]) => iso(v.filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null);
  const list: Product[] = rows.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, rank: r.rank, dept: r.deptSlug, aisle: r.aisleSlug, category: r.aisleName,
    brand: r.brand, size: [r.pack, r.volume].filter(Boolean).join(", ") || null, pack: r.pack, volume: r.volume, upc: r.upc,
    price: { regularCents: r.regularCents, saleCents: r.saleCents, saleStartsAt: iso(r.saleStartsAt), saleEndsAt: iso(r.saleEndsAt) },
    quantity: r.quantity, image: r.imgUrl ? { src: r.imgUrl, alt: r.imgAlt!, width: r.imgW!, height: r.imgH!, blur: r.imgBlur } : null,
    description: r.description, abv: r.abv == null ? null : Number(r.abv), country: r.country, region: r.region, varietal: r.varietal,
    gameDay: r.gameDay, note: r.note,
    art: { id: r.id, name: r.name, ...(r.art ?? { dept: "", aisle: r.aisleName, shape: "box", body: "#2d4f92", ink: "#ffffff", flv: "" }) },
    createdAt: iso(r.createdAt), updatedAt: latest(r.priceUpdated, r.stockUpdated, r.updatedAt),
  }));

  const counts = new Map<string, number>();
  for (const p of list) counts.set(`${p.dept}/${p.aisle}`, (counts.get(`${p.dept}/${p.aisle}`) ?? 0) + 1);
  const departments: Department[] = cats.filter((c) => c.parentId == null).map((dc) => {
    const children = cats.filter((c) => c.parentId === dc.id)
      .map((a) => ({ slug: a.slug, name: a.name, count: counts.get(`${dc.slug}/${a.slug}`) ?? 0 }))
      .filter((a) => a.count > 0).sort((a, b) => b.count - a.count);
    return { slug: dc.slug, name: dc.name, count: children.reduce((n, a) => n + a.count, 0), children };
  }).filter((x) => x.count > 0);
  const ORDER = ["beer", "wine", "spirits", "soft-drinks", "grocery"];
  departments.sort((a, b) => (ORDER.indexOf(a.slug) + 1 || 99) - (ORDER.indexOf(b.slug) + 1 || 99));

  return { version, source: "database", products: list, departments, redirects: new Map(redirects.map((r) => [r.from, r.to])) };
}
