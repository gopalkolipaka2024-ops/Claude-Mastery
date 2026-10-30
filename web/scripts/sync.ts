/*
  Full catalog sync from the point of sale into the database.
    npm run sync -- --source export              (the cleaned one-time export, src/data/catalog.json)
    npm run sync -- --source csv --file items.csv  (a Bottle POS item export)
    add --dry-run to read and validate without writing
  Needs DATABASE_URL_WRITE. If SITE_URL and REVALIDATE_TOKEN are set, tells the live site to refresh.
  Exit code 1 on failure (the scheduled workflow alerts on it).
*/
import { existsSync, readFileSync } from "node:fs";
import { db } from "../src/db/client";
import { applyItems } from "../src/sync/apply";
import { catalogExportItems } from "../src/sync/sources/catalog-export";
import { csvItems } from "../src/sync/sources/csv";
import { posItem, type PosItem } from "../src/sync/types";

if (existsSync(".env.development.local") && !process.env.DATABASE_URL_WRITE) {
  for (const line of readFileSync(".env.development.local", "utf8").split("\n")) {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m) process.env[m[1]!] ??= m[2];
  }
}
const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const source = arg("source") ?? "export";
const dry = process.argv.includes("--dry-run");
const log = (msg: string, extra: Record<string, unknown> = {}) => console.log(JSON.stringify({ at: new Date().toISOString(), msg, ...extra }));

let items: PosItem[];
if (source === "csv") {
  const file = arg("file");
  if (!file) throw new Error("--file is required for --source csv");
  const rep = csvItems(file);
  log("csv read", { file, items: rep.items.length, columns: rep.columns, skipped: rep.skipped.length, unmappedCategories: rep.unmappedCategories });
  items = rep.items;
} else {
  items = catalogExportItems();
  log("export read", { items: items.length });
}

const bad = items.map((it, i) => [i, posItem.safeParse(it)] as const).filter(([, r]) => !r.success);
if (bad.length) {
  log("validation failed", { count: bad.length, first: bad.slice(0, 5).map(([i, r]) => ({ index: i, sku: items[i]!.sku, issues: r.error!.issues.map((x) => `${x.path.join(".")}: ${x.message}`) })) });
  process.exit(1);
}
const dupes = items.length - new Set(items.map((i) => i.sku)).size;
if (dupes) { log("duplicate skus in feed", { dupes }); process.exit(1); }
if (dry) { log("dry run ok, nothing written"); process.exit(0); }

try {
  const started = Date.now();
  const r = await applyItems(db("write"), items, { source, kind: "full" });
  log("sync ok", { ms: Date.now() - started, runId: r.runId, created: r.created, updated: r.updated, deactivated: r.deactivated, unchanged: r.unchanged });
  const site = process.env.SITE_URL, token = process.env.REVALIDATE_TOKEN;
  if (site && token && (r.created || r.updated || r.deactivated)) {
    const res = await fetch(`${site}/api/internal/revalidate`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    log("site revalidate", { status: res.status });
    if (!res.ok) process.exitCode = 1;
  }
} catch (e) {
  log("sync failed", { error: String((e as Error).message ?? e) });
  process.exitCode = 1;
} finally {
  // close the pool so the process exits
  await (db("write") as unknown as { $client: { end(): Promise<void> } }).$client.end();
}
