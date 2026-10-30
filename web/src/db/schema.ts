/*
  Database schema (Postgres). A product is one sellable item on the shelf; variants
  hold its size, SKU and UPC, and prices/stock hang off the variant. Today each product
  has one variant; the table lets multi-size products be grouped later without a migration.
  Every filter and sort field is indexed.
*/
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn, boolean, check, date, index, integer, jsonb, numeric, pgTable, primaryKey, serial, smallint, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "restrict" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  depth: smallint("depth").notNull().default(0), // 0 = department, 1 = aisle, 2 = sub-aisle (max 3 levels)
  position: integer("position").notNull().default(0),
}, (t) => [
  uniqueIndex("categories_parent_slug").on(sql`coalesce(${t.parentId}, 0)`, t.slug),
  check("categories_depth", sql`${t.depth} between 0 and 2`),
]);

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "set null" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  description: text("description"),
  abv: numeric("abv", { precision: 4, scale: 1 }),
  country: text("country"),
  region: text("region"),
  varietal: text("varietal"),
  active: boolean("active").notNull().default(true),
  rank: integer("rank").notNull().default(100000), // store's own ordering, 1 = most popular
  gameDay: boolean("game_day").notNull().default(false),
  art: jsonb("art").$type<{ dept: string; aisle: string; shape: string; body: string; ink: string; flv: string }>(),
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  index("products_category").on(t.categoryId).where(sql`${t.active}`),
  index("products_brand").on(t.brandId),
  index("products_rank").on(t.rank),
  index("products_name").on(t.name),
  index("products_created").on(t.createdAt),
  index("products_country").on(t.country),
  index("products_varietal").on(t.varietal),
]);

export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(), // the POS item key; sync matches on this
  upc: text("upc"),
  pack: text("pack"),
  volume: text("volume"),
  position: smallint("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
}, (t) => [index("variants_product").on(t.productId), index("variants_upc").on(t.upc), index("variants_pack").on(t.pack), index("variants_volume").on(t.volume)]);

export const prices = pgTable("prices", {
  variantId: integer("variant_id").primaryKey().references(() => variants.id, { onDelete: "cascade" }),
  regularCents: integer("regular_cents"),
  saleCents: integer("sale_cents"),
  saleStartsAt: ts("sale_starts_at"),
  saleEndsAt: ts("sale_ends_at"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  index("prices_regular").on(t.regularCents),
  check("prices_nonnegative", sql`coalesce(${t.regularCents}, 0) >= 0 and coalesce(${t.saleCents}, 0) >= 0`),
]);

export const stock = pgTable("stock", {
  variantId: integer("variant_id").primaryKey().references(() => variants.id, { onDelete: "cascade" }),
  quantity: integer("quantity"), // never exposed publicly; mapped to a badge
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("stock_quantity").on(t.quantity)]);

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  position: smallint("position").notNull().default(0),
}, (t) => [index("images_product").on(t.productId, t.position)]);

/** Old product slugs, so renamed products 301 to their new page. */
export const slugRedirects = pgTable("slug_redirects", {
  fromSlug: text("from_slug").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
});

/* ---- Content managed in the admin area ---- */
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  href: text("href"),
  tone: text("tone").notNull().default("brand"),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: date("starts_at").notNull(),
  endsAt: date("ends_at").notNull(),
}, (t) => [index("deals_window").on(t.startsAt, t.endsAt), check("deals_order", sql`${t.endsAt} >= ${t.startsAt}`)]);

export const dealProducts = pgTable("deal_products", {
  dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.dealId, t.productId] })]);

export const featuredProducts = pgTable("featured_products", {
  productId: integer("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  position: smallint("position").notNull().default(0),
});

/** Weekly hours, Sunday = 0. Null open/close = closed that day. */
export const storeHours = pgTable("store_hours", {
  dow: smallint("dow").primaryKey(),
  open: text("open"),
  close: text("close"),
}, (t) => [check("store_hours_dow", sql`${t.dow} between 0 and 6`)]);

export const holidayHours = pgTable("holiday_hours", {
  date: date("date").primaryKey(),
  label: text("label").notNull(),
  open: text("open"),
  close: text("close"),
});

/* ---- Sync bookkeeping ---- */
export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  kind: text("kind").notNull(), // "full" | "webhook"
  status: text("status").notNull().default("running"), // "running" | "ok" | "failed"
  startedAt: ts("started_at").notNull().defaultNow(),
  finishedAt: ts("finished_at"),
  itemsSeen: integer("items_seen").notNull().default(0),
  created: integer("created").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  deactivated: integer("deactivated").notNull().default(0),
  error: text("error"),
}, (t) => [index("sync_runs_started").on(t.startedAt)]);

/** Bumped on every change, so caches and the search index know when to refresh. */
export const catalogState = pgTable("catalog_state", {
  id: smallint("id").primaryKey().default(1),
  version: integer("version").notNull().default(1),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});
