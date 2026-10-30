// Smoke test against a running site (default http://localhost:3000): loads key pages,
// runs axe (WCAG 2.2 AA), checks for console errors, and exercises age gate, filters and search.
// Usage: node scripts/check-pages.mjs [baseUrl] [screenshotDir]
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axe = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const base = process.argv[2] ?? "http://localhost:3000";
const shots = process.argv[3];
if (shots) await mkdir(shots, { recursive: true });

const browser = await chromium.launch();
let failures = 0;
const fail = (m) => { failures++; console.log("FAIL", m); };

async function audit(page, label) {
  await page.addScriptTag({ content: axe });
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] })).violations.map((x) => `${x.impact}: ${x.id} (${x.nodes.length}) ${x.nodes[0]?.target?.join(" ")}`));
  if (v.length) fail(`${label} axe:\n   ${v.join("\n   ")}`); else console.log("pass", label, "axe");
}

for (const [w, h, name] of [[1366, 900, "desktop"], [390, 844, "mobile"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !m.location().url.includes("/nope-not-here")) errors.push(m.text()); });

  // Age gate appears, is a modal, and remembers "yes"
  await page.goto(base + "/", { waitUntil: "load" });
  const gate = page.getByRole("dialog", { name: "Are you 21 or older?" });
  if (!(await gate.waitFor({ timeout: 5000 }).then(() => true, () => false))) fail(`${name}: age gate not shown`);
  if (shots) await page.screenshot({ path: `${shots}/${name}-agegate.png` });
  await audit(page, `${name} age gate`);
  await page.getByRole("button", { name: "Yes, I'm 21+" }).click();
  await page.reload({ waitUntil: "load" });
  if (await gate.isVisible()) fail(`${name}: age gate came back after confirming`);

  for (const [path, label] of [["/", "home"], ["/c/beer", "department"], ["/c/beer/light-beer?pack=30+pk", "aisle filtered"], ["/search?q=cab", "search synonym"], ["/search?q=coors+lite", "search typo"], ["/search?q=zzqxv", "search empty"], ["/p/coors-light-30-pk", "product"], ["/store", "store"], ["/contact", "contact"], ["/deals", "deals"], ["/privacy", "privacy"], ["/nope-not-here", "404"]]) {
    const res = await page.goto(base + path, { waitUntil: "load" });
    if (label === "404" ? res.status() !== 404 : res.status() !== 200) fail(`${name} ${label}: HTTP ${res.status()}`);
    await page.waitForTimeout(400);
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    console.log(`     ${name} ${label}: "${h1?.trim()}" ${label.startsWith("search") || label.includes("depart") || label.includes("aisle") ? "| " + (await page.locator("p[aria-live]").first().textContent().catch(() => "")) : ""}`);
    if (shots) await page.screenshot({ path: `${shots}/${name}-${label.replace(/\s+/g, "-")}.png`, fullPage: false });
    await audit(page, `${name} ${label}`);
  }

  // Filters write to the URL and Back restores the previous list
  await page.goto(base + "/c/beer", { waitUntil: "load" });
  if (name === "desktop") {
    const count = page.locator("p[aria-live]").first();
    const t0 = await count.textContent();
    await page.getByRole("complementary", { name: "Filters" }).getByRole("link", { name: /^Light beer/ }).click();
    await page.waitForURL(/aisle=light-beer/);
    await page.waitForFunction((t) => document.querySelector("p[aria-live]")?.textContent !== t, t0);
    const t1 = await count.textContent();
    await page.goBack(); await page.waitForURL((u) => !u.search.includes("aisle"));
    await page.waitForFunction((t) => document.querySelector("p[aria-live]")?.textContent !== t, t1);
    const t2 = await count.textContent();
    if (t1 === t2) fail("filter + back did not change results"); else console.log(`pass filter→URL→back (${t1} → ${t2})`);
    // Load more keeps a shareable page param
    await page.getByRole("link", { name: /Load \d+ more/ }).click();
    await page.waitForURL(/page=2/);
    console.log("pass load more →", new URL(page.url()).search);
  } else {
    await page.getByRole("button", { name: /^Filter/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filter" });
    // The sheet's code downloads on first tap, so give it a moment
    if (!(await sheet.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false))) fail("mobile filter sheet did not open");
    if (shots) await page.screenshot({ path: `${shots}/mobile-filter-sheet.png` });
    await page.keyboard.press("Escape");
    if (await sheet.isVisible()) fail("mobile filter sheet did not close on Escape");
    else console.log("pass mobile filter sheet opens and closes with Escape");
  }

  // Autocomplete answers quickly
  await page.goto(base + "/", { waitUntil: "load" });
  const box = page.getByRole("combobox", { name: "Search products" });
  await box.click();
  const t0 = Date.now();
  await box.fill("miller");
  await page.getByRole("option").first().waitFor();
  console.log(`pass ${name} autocomplete shown in ${Date.now() - t0} ms`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 0) fail(`${name}: page scrolls sideways by ${overflow}px`);
  if (errors.length) fail(`${name} console errors: ${[...new Set(errors)].join(" | ")}`);
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll page checks passed");
process.exit(failures ? 1 : 0);
