// Keyboard and interaction accessibility checks that axe can't do: skip link, visible and
// unobscured focus, landmarks, focus trap / Escape / focus return in every dialog and menu,
// search combobox keys, form errors, 44px tap targets, image alt text and 320px reflow.
// usage: node scripts/check-keyboard.mjs [baseUrl]   (default http://localhost:3000)
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const PAGES = ["/", "/c/beer", "/c/beer/light-beer", "/search?q=coors", "/p/coors-light-30-pk", "/store", "/contact", "/deals", "/privacy"];
let failures = 0;
const fail = (m) => { failures++; console.log("FAIL", m); };
const pass = (m) => console.log("pass", m);
const check = (ok, m, detail = "") => (ok ? pass(m) : fail(detail ? `${m}: ${detail}` : m));

const browser = await chromium.launch();
async function context(viewport, ageOk = true) {
  const ctx = await browser.newContext({ viewport });
  if (ageOk) await ctx.addCookies([{ name: "asm_age_ok", value: "1", url: base }]);
  return ctx;
}
const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return el && el !== document.body ? { tag: el.tagName, text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40), inDialog: !!el.closest('[role="dialog"]'), inMain: !!el.closest("main") } : null;
});
async function tabs(page, n, fn) { for (let i = 0; i < n; i++) { await page.keyboard.press("Tab"); if (fn) await fn(i); } }

// Tab through a page: every stop must show a focus indicator and not be hidden under the sticky header
async function focusWalk(page, label, stops = 45) {
  const bad = new Set();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("body").focus();
  await tabs(page, stops, async () => {
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const shows = (n) => { const s = getComputedStyle(n); return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow && s.boxShadow !== "none"); };
      // The indicator may be drawn on the element, on a wrapper using :focus-within (search field),
      // or by a ring overlay on the card the link covers (product cards).
      const card = el.closest("article");
      const overlay = card && [...card.querySelectorAll(':scope > [aria-hidden="true"]')].some((o) => getComputedStyle(o).opacity === "1" && shows(o));
      const ring = shows(el) || (el.parentElement?.matches(":focus-within") && shows(el.parentElement)) || (el.parentElement?.parentElement && shows(el.parentElement.parentElement)) || overlay;
      const rect = el.getBoundingClientRect();
      const header = document.querySelector("header")?.getBoundingClientRect();
      const covered = header && getComputedStyle(document.querySelector("header")).position === "sticky" && !el.closest("header") && getComputedStyle(el).position !== "fixed" && rect.bottom <= header.bottom;
      return { name: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}"`, ring, covered, size: rect.width * rect.height };
    });
    if (!r) return;
    if (!r.ring) bad.add(`no focus indicator on ${r.name}`);
    if (r.covered) bad.add(`focus hidden under header: ${r.name}`);
    if (r.size === 0) bad.add(`focus on invisible element ${r.name}`);
  });
  check(!bad.size, `${label} focus visible on ${stops} tab stops`, [...bad].slice(0, 6).join("; "));
}

async function dialogCycle(page, label, open, expectReturn) {
  await open();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  if (!(await dialog.isVisible())) return fail(`${label} did not open`);
  check((await focused(page))?.inDialog, `${label} moves focus into the dialog`);
  let escaped = false;
  await tabs(page, 40, async () => { if (!(await focused(page))?.inDialog) escaped = true; });
  await page.keyboard.down("Shift"); await tabs(page, 5, async () => { if (!(await focused(page))?.inDialog) escaped = true; }); await page.keyboard.up("Shift");
  check(!escaped, `${label} keeps Tab and Shift+Tab inside`);
  const inert = await page.evaluate(() => [...document.body.children].filter((c) => !c.querySelector('[role="dialog"]') && c.tagName !== "SCRIPT").every((c) => c.inert || c.getAttribute("aria-hidden") === "true"));
  check(inert, `${label} hides the page behind it from screen readers`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  check(!(await dialog.isVisible()), `${label} closes with Escape`);
  const back = await focused(page);
  check(back && expectReturn(back), `${label} returns focus to its button`, JSON.stringify(back));
}

/* ---------------- desktop ---------------- */
{
  const ctx = await context({ width: 1366, height: 900 });
  const page = await ctx.newPage();
  await page.goto(base + "/c/beer", { waitUntil: "load" });

  // Skip link is the first stop, becomes visible, and moves focus to the main content
  await page.keyboard.press("Tab");
  const skip = await page.evaluate(() => { const el = document.activeElement; const r = el.getBoundingClientRect(); return { text: el.textContent.trim(), visible: r.width > 20 && r.height > 20 && r.top >= 0 }; });
  check(skip.text === "Skip to content" && skip.visible, "skip link is first and visible on focus", JSON.stringify(skip));
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  check((await focused(page))?.inMain, "skip link moves keyboard focus into main", JSON.stringify(await focused(page)));

  // Landmarks
  for (const path of PAGES) {
    await page.goto(base + path, { waitUntil: "load" });
    const l = await page.evaluate(() => {
      const navs = [...document.querySelectorAll("nav")].map((n) => n.getAttribute("aria-label") || n.getAttribute("aria-labelledby") || "");
      return { banner: document.querySelectorAll("header:not(main header):not(article header)").length, main: document.querySelectorAll("main").length, footer: document.querySelectorAll("body > footer, body > * > footer").length, navs, lang: document.documentElement.lang };
    });
    const dupes = l.navs.filter((n, i) => !n || l.navs.indexOf(n) !== i);
    check(l.banner === 1 && l.main === 1 && l.footer >= 1 && !dupes.length && l.lang === "en", `landmarks on ${path}`, JSON.stringify(l));
  }

  for (const path of ["/", "/c/beer", "/p/coors-light-30-pk", "/contact"]) { await page.goto(base + path, { waitUntil: "load" }); await focusWalk(page, `desktop ${path}`); }

  // Mega menu: Enter opens, Tab goes into the panel, Escape closes and returns focus
  await page.goto(base + "/", { waitUntil: "load" });
  const beer = page.getByRole("navigation", { name: "Shop by category" }).getByRole("button").first();
  await beer.focus(); await page.keyboard.press("Enter");
  check((await beer.getAttribute("aria-expanded")) === "true", "mega menu opens with Enter");
  await page.keyboard.press("Tab");
  const inPanel = await page.evaluate(() => !!document.activeElement.closest('[id^="mega-"]'));
  check(inPanel, "Tab moves from the menu button into its panel");
  await page.keyboard.press("Escape");
  check((await beer.getAttribute("aria-expanded")) === "false" && (await page.evaluate(() => document.activeElement.getAttribute("aria-expanded"))) === "false", "mega menu closes with Escape and returns focus");

  // Search combobox
  const box = page.getByRole("combobox");
  await box.focus(); await page.keyboard.type("coors", { delay: 30 });
  await page.getByRole("listbox").waitFor({ timeout: 4000 }).catch(() => {});
  await page.keyboard.press("ArrowDown");
  const active = await box.getAttribute("aria-activedescendant");
  check(!!active && (await page.locator(`[id="${active}"]`).getAttribute("aria-selected")) === "true", "search: ArrowDown highlights a suggestion");
  const groups = await page.evaluate(() => [...document.querySelectorAll('[role="listbox"] [role="group"]')].map((g) => g.getAttribute("aria-label") || document.getElementById(g.getAttribute("aria-labelledby") ?? "")?.textContent));
  check(groups.length > 0 && groups.every(Boolean), "search: suggestion groups are named for screen readers", JSON.stringify(groups));
  await page.keyboard.press("Escape");
  check(!(await page.getByRole("listbox").isVisible().catch(() => false)), "search: Escape closes suggestions");

  // Contact form errors: focus moves to a summary that names each problem and links to the field
  await page.goto(base + "/contact", { waitUntil: "load" });
  await page.getByRole("button", { name: "Send message" }).click();
  await page.waitForTimeout(800);
  const f = await page.evaluate(() => ({
    focus: document.activeElement?.textContent?.slice(0, 80),
    links: [...document.activeElement?.querySelectorAll?.("a[href^='#']") ?? []].map((a) => a.getAttribute("href")),
    fields: ["name", "email", "message"].map((id) => { const el = document.getElementById(id); return [id, el?.getAttribute("aria-invalid"), !!document.getElementById(el?.getAttribute("aria-describedby") ?? "")]; }),
    required: ["name", "email", "message"].every((id) => document.querySelector(`label[for="${id}"]`)?.textContent.toLowerCase().includes("required") || document.getElementById(id)?.getAttribute("aria-required") === "true" || document.getElementById(id)?.required),
  }));
  check(/fix/i.test(f.focus ?? "") && f.links.length === 3, "contact: error summary gets focus and links to each field", JSON.stringify(f));
  check(f.fields.every(([, inv, desc]) => inv === "true" && desc), "contact: each field is marked invalid and points to its message", JSON.stringify(f.fields));
  await ctx.close();
}

/* ---------------- phone ---------------- */
{
  const ctx = await context({ width: 390, height: 844 });
  const page = await ctx.newPage();
  await page.goto(base + "/c/beer", { waitUntil: "load" });
  await focusWalk(page, "phone /c/beer", 30);

  await dialogCycle(page, "mobile menu", async () => { await page.getByRole("button", { name: "Open menu" }).focus(); await page.keyboard.press("Enter"); }, (b) => b.text === "Open menu");
  await dialogCycle(page, "filter sheet", async () => { await page.getByRole("button", { name: /^Filter/ }).focus(); await page.keyboard.press("Enter"); }, (b) => b.text.startsWith("Filter"));

  // 44px tap targets (inline links inside sentences are exempt, as in WCAG 2.5.8)
  for (const path of PAGES) {
    await page.goto(base + path, { waitUntil: "load" });
    const small = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [role=option], [role=button]")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || el.closest('[aria-hidden="true"]') || getComputedStyle(el).visibility === "hidden") continue;
        if (el.matches("p a, li > p a, dd a, td a, figcaption a") || el.closest(".prose")) continue;
        if (el.matches("input[type=checkbox], input[type=radio]") && el.closest("label")) continue;
        if (r.width <= 1 && r.height <= 1) continue; // visually hidden until focused (skip link)
        // A link stretched over its card with ::after (product cards): the card is the target
        const stretched = getComputedStyle(el, "::after").position === "absolute" && el.closest("article, li");
        const target = stretched || el.closest("label") || el;
        const t = target.getBoundingClientRect();
        if (t.height < 44 || t.width < 44) out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "").trim().slice(0, 24)}" ${Math.round(t.width)}x${Math.round(t.height)}`);
      }
      return [...new Set(out)];
    });
    check(!small.length, `44px tap targets on ${path}`, small.slice(0, 8).join("; ") + (small.length > 8 ? ` (+${small.length - 8} more)` : ""));
  }

  // Images: every <img> has alt; meaningful SVGs are named, decorative ones hidden
  for (const path of PAGES) {
    await page.goto(base + path, { waitUntil: "load" });
    const imgs = await page.evaluate(() => [
      ...[...document.querySelectorAll("img:not([alt])")].map((i) => `img ${i.src.slice(-30)}`),
      ...[...document.querySelectorAll("svg")].filter((s) => !s.closest('[aria-hidden="true"]') && s.getAttribute("aria-hidden") !== "true" && !(s.getAttribute("role") === "img" && (s.getAttribute("aria-label") || s.querySelector("title")))).map((s) => `svg ${s.outerHTML.slice(0, 50)}`),
    ]);
    check(!imgs.length, `image alternatives on ${path}`, imgs.slice(0, 4).join("; "));
  }
  await ctx.close();
}

/* ---------------- age gate ---------------- */
{
  const ctx = await context({ width: 390, height: 844 }, false);
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  const gate = page.getByRole("dialog", { name: "Are you 21 or older?" });
  await gate.waitFor({ timeout: 5000 });
  check((await focused(page))?.inDialog, "age gate takes focus");
  let escaped = false;
  await tabs(page, 15, async () => { if (!(await focused(page))?.inDialog) escaped = true; });
  check(!escaped, "age gate keeps focus until answered");
  const inert = await page.evaluate(() => [...document.body.children].filter((c) => !c.querySelector('[role="dialog"]') && c.tagName !== "SCRIPT").every((c) => c.inert || c.getAttribute("aria-hidden") === "true"));
  check(inert, "age gate hides the page behind it from screen readers");
  await ctx.close();
}

/* ---------------- 320px reflow (WCAG 1.4.10) ---------------- */
{
  const ctx = await context({ width: 320, height: 640 });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    await page.goto(base + path, { waitUntil: "load" });
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    check(w <= 320, `no sideways scrolling at 320px on ${path}`, `page is ${w}px wide`);
  }
  await ctx.close();
}

/* ---------------- reduced motion ---------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: "reduce" });
  await ctx.addCookies([{ name: "asm_age_ok", value: "1", url: base }]);
  const page = await ctx.newPage();
  await page.goto(base + "/p/coors-light-30-pk", { waitUntil: "load" });
  const moving = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getTiming().duration ?? 0) > 50).length);
  check(moving === 0, "reduced motion stops animations", `${moving} running`);
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll keyboard and interaction checks passed");
process.exit(failures ? 1 : 0);
