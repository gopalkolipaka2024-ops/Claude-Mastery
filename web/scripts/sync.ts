/*
  Full catalog sync from the point of sale into the database.
    npm run sync -- --source export              (the cleaned one-time export, src/data/catalog.json)
    npm run sync -- --source csv --file items.csv  (a Bottle POS item export)
    add --dry-run to read and validate without writing
  add --allow-mass-deactivate only after checking the feed, when a run is meant to hide over 20% of products
  Needs DATABASE_URL_WRITE. If SITE_URL and REVALIDATE_TOKEN are set, tells the live site to refresh.
  Logs one JSON object per line. On failure: exit code 1 (the scheduled workflow then fails and
  GitHub emails the owner) and, when SENTRY_DSN is set, an error event in Sentry (alert rule).
*/
import { existsSync, readFileSync } from "node:fs";
import { db } from "../src/db/client";
import { applyItems } from "../src/sync/apply";
import { log as writeLog } from "../src/lib/log";
import { reportError } from "../src/lib/error-report";
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
const allowMassDeactivate = process.argv.includes("--allow-mass-deactivate");
process.env.LOG_SERVICE ??= "sync";
const log = (msg: string, extra: Record<string, unknown> = {}) => writeLog("info", msg, { source, ...extra });
/** Logs, reports to error tracking, and marks the run failed. */
async function failed(msg: string, extra: Record<string, unknown> = {}) {
  writeLog("error", msg, { source, ...extra });
  await reportError(new Error(`Catalog sync failed: ${msg}${extra.error ? `. ${extra.error}` : ""}`), { source: "sync", tags: { syncSource: source }, extra });
  process.exitCode = 1;
}

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
  await failed("validation failed", { count: bad.length, first: bad.slice(0, 5).map(([i, r]) => ({ index: i, sku: items[i]!.sku, issues: r.error!.issues.map((x) => `${x.path.join(".")}: ${x.message}`) })) });
  process.exit(1);
}
const dupes = items.length - new Set(items.map((i) => i.sku)).size;
if (dupes) { await failed("duplicate skus in feed", { dupes }); process.exit(1); }
if (!items.length) { await failed("feed has no items"); process.exit(1); }
if (dry) { log("dry run ok, nothing written"); process.exit(0); }

try {
  const started = Date.now();
  const r = await applyItems(db("write"), items, { source, kind: "full", allowMassDeactivate });
  log("sync ok", { ms: Date.now() - started, runId: r.runId, created: r.created, updated: r.updated, deactivated: r.deactivated, unchanged: r.unchanged });
  const site = process.env.SITE_URL, token = process.env.REVALIDATE_TOKEN;
  if (site && token && (r.created || r.updated || r.deactivated)) {
    const res = await fetch(`${site}/api/internal/revalidate`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    if (res.ok) log("site revalidate", { status: res.status });
    else await failed("site revalidate failed", { status: res.status });
  }
} catch (e) {
  await failed("apply failed", { error: String((e as Error).message ?? e) });
} finally {
  // close the pool so the process exits
  await (db("write") as unknown as { $client: { end(): Promise<void> } }).$client.end();
}
