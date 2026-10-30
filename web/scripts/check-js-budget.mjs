// First-load JavaScript budget: for each key route, sums the compressed (gzip) size of every
// script the HTML loads or preloads, and fails if any route is over the budget.
// usage: node scripts/check-js-budget.mjs [baseUrl]   (default http://localhost:3100)
import { gzipSync } from "node:zlib";

const BUDGET_KB = 150;
const base = process.argv[2] ?? "http://localhost:3100";
const routes = { Home: "/", Category: "/c/beer", Search: "/search?q=coors", Product: "/p/coors-light-30-pk" };
const sizes = new Map();
const kb = (n) => (n / 1024).toFixed(1);

async function size(src) {
  if (!sizes.has(src)) sizes.set(src, fetch(new URL(src, base)).then(async (r) => {
    if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`);
    return gzipSync(Buffer.from(await r.arrayBuffer()), { level: 6 }).length;
  }));
  return sizes.get(src);
}

let failed = false;
for (const [name, path] of Object.entries(routes)) {
  const html = await (await fetch(base + path, { headers: { cookie: "asm_age_ok=1" } })).text();
  const srcs = new Set([
    // noModule scripts are polyfills that only very old browsers download
    ...[...html.matchAll(/<script([^>]+)>/g)].filter((m) => !/nomodule/i.test(m[1])).map((m) => m[1].match(/src="([^"]+)"/)?.[1]),
    ...[...html.matchAll(/<link[^>]+rel="(?:preload|modulepreload)"[^>]+as="script"[^>]+href="([^"]+)"|<link[^>]+href="([^"]+)"[^>]+as="script"/g)].map((m) => m[1] ?? m[2]),
  ].filter(Boolean).map((s) => s.replaceAll("&amp;", "&")));
  const total = (await Promise.all([...srcs].map(size))).reduce((a, b) => a + b, 0);
  const over = total > BUDGET_KB * 1024;
  failed ||= over;
  console.log(`${over ? "FAIL" : "pass"} ${name.padEnd(9)} ${kb(total).padStart(6)} KB of ${BUDGET_KB} KB  (${srcs.size} scripts)`);
}
if (failed) { console.error(`First-load JS is over ${BUDGET_KB} KB on at least one route.`); process.exit(1); }
