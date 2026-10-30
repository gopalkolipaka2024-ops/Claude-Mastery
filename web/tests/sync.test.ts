import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { applyItems } from "@/sync/apply";
import type { PosItem } from "@/sync/types";

/*
  Integration test against real Postgres. Needs TEST_DATABASE_ADMIN_URL (a role that can create
  databases), e.g. postgres://owner:owner@localhost:54329/postgres from `npm run db:start`.
  Creates a throwaway database, applies the migrations, and checks the sync rules.
*/
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
const NAME = `adams_test_${process.pid}`;
let pool: pg.Pool;
let db: ReturnType<typeof drizzle<typeof schema>>;

const item = (over: Partial<PosItem> = {}): PosItem => ({ sku: "S1", name: "Coors Light 30 pk", department: "Beer & Seltzers", aisle: "Light beer", pack: "30 pk", priceCents: 2899, quantity: 10, ...over });

describe.skipIf(!adminUrl)("sync", () => {
  beforeAll(async () => {
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`drop database if exists ${NAME}`);
    await admin.query(`create database ${NAME}`);
    await admin.end();
    pool = new pg.Pool({ connectionString: adminUrl!.replace(/\/[^/]*$/, `/${NAME}`) });
    const journal = JSON.parse(readFileSync("src/db/migrations/meta/_journal.json", "utf8"));
    for (const e of journal.entries) for (const stmt of readFileSync(`src/db/migrations/${e.tag}.sql`, "utf8").split("--> statement-breakpoint")) if (stmt.trim()) await pool.query(stmt);
    db = drizzle(pool, { schema });
  });
  afterAll(async () => {
    await pool?.end();
    if (!adminUrl) return;
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`drop database if exists ${NAME}`);
    await admin.end();
  });

  it("creates products, then a second identical run changes nothing", async () => {
    const r1 = await applyItems(db as never, [item(), item({ sku: "S2", name: "Miller Lite 30 pk", priceCents: 2799 })], { source: "test", kind: "full" });
    expect(r1).toMatchObject({ created: 2, updated: 0 });
    const r2 = await applyItems(db as never, [item(), item({ sku: "S2", name: "Miller Lite 30 pk", priceCents: 2799 })], { source: "test", kind: "full" });
    expect(r2).toMatchObject({ created: 0, updated: 0, unchanged: 2, deactivated: 0 });
  });

  it("applies a partial webhook update without touching other fields", async () => {
    const r = await applyItems(db as never, [{ sku: "S1", saleCents: 2599, saleEndsAt: "2026-12-01" }], { source: "test", kind: "webhook" });
    expect(r).toMatchObject({ updated: 1, changedSlugs: ["coors-light-30-pk"], changedDepartments: ["beer"] });
    const [row] = await db.select().from(schema.prices).innerJoin(schema.variants, eq(schema.variants.id, schema.prices.variantId)).where(eq(schema.variants.sku, "S1"));
    expect(row!.prices).toMatchObject({ regularCents: 2899, saleCents: 2599 });
    const [st] = await db.select().from(schema.stock).where(eq(schema.stock.variantId, row!.variants.id));
    expect(st!.quantity).toBe(10);
  });

  it("reports unknown skus on a webhook instead of guessing", async () => {
    const r = await applyItems(db as never, [{ sku: "NOPE", priceCents: 1 }], { source: "test", kind: "webhook" });
    expect(r).toMatchObject({ created: 0, updated: 0, unknownSkus: ["NOPE"] });
  });

  it("gives a renamed product a new slug and keeps the old one as a redirect", async () => {
    await applyItems(db as never, [{ sku: "S2", name: "Miller Lite 30 pk Cans" }], { source: "test", kind: "webhook" });
    const [p] = await db.select().from(schema.products).where(eq(schema.products.name, "Miller Lite 30 pk Cans"));
    expect(p!.slug).toBe("miller-lite-30-pk-cans");
    const [redir] = await db.select().from(schema.slugRedirects).where(eq(schema.slugRedirects.fromSlug, "miller-lite-30-pk"));
    expect(redir!.productId).toBe(p!.id);
  });

  it("hides products that leave the feed on a full sync, and brings them back", async () => {
    const r = await applyItems(db as never, [item()], { source: "test", kind: "full" });
    expect(r.deactivated).toBe(1);
    const [p] = await db.select().from(schema.products).where(eq(schema.products.name, "Miller Lite 30 pk Cans"));
    expect(p!.active).toBe(false);
    const back = await applyItems(db as never, [item(), item({ sku: "S2", name: "Miller Lite 30 pk Cans", priceCents: 2799 })], { source: "test", kind: "full" });
    expect(back.updated).toBeGreaterThanOrEqual(1);
    const [again] = await db.select().from(schema.products).where(eq(schema.products.id, p!.id));
    expect(again!.active).toBe(true);
  });

  it("records every run, including failures, and rolls back a failed run", async () => {
    await expect(applyItems(db as never, [item({ sku: "S9", name: "Bad", priceCents: -1 })], { source: "test", kind: "full" })).rejects.toThrow();
    const runs = await db.select().from(schema.syncRuns);
    expect(runs.at(-1)).toMatchObject({ status: "failed" });
    const bad = await db.select().from(schema.products).where(eq(schema.products.name, "Bad"));
    expect(bad).toHaveLength(0);
  });
});
