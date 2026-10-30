// Opens every Storybook story in Chromium and runs axe-core (WCAG 2.2 A/AA rules).
// Usage: npm run build-storybook && node scripts/a11y-stories.mjs [storybook-static]
// Exits 1 if any story has a violation. Also screenshots each story to ./.a11y-shots for review.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const root = resolve(process.argv[2] ?? "storybook-static");
const shots = process.env.A11Y_SHOTS;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const body = await readFile(join(root, path === "/" ? "index.html" : path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const index = JSON.parse(await readFile(join(root, "index.json"), "utf8"));
const stories = Object.values(index.entries).filter((e) => e.type === "story");
const browser = await chromium.launch();
if (shots) await mkdir(shots, { recursive: true });
let failures = 0;
for (const s of stories) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/iframe.html?id=${s.id}&viewMode=story`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const broken = await page.evaluate(() => {
    const err = document.body.classList.contains("sb-show-errordisplay") ? document.querySelector("#error-message")?.textContent || "render error" : "";
    const root = document.querySelector("#storybook-root");
    const empty = !err && root && !root.innerHTML.trim() && !document.querySelector('[role="dialog"]') ? "story rendered nothing" : "";
    return err || empty;
  });
  if (broken) errors.push(broken);
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    // @ts-ignore
    const r = await window.axe.run(document.querySelector("#storybook-root") ?? document.body, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"], rules: { region: { enabled: false } } });
    return r.violations.map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target?.join(" ")}`);
  });
  if (shots) await page.screenshot({ path: join(shots, `${s.id}.png`), fullPage: true });
  const bad = result.length || errors.length;
  if (bad) failures++;
  console.log(`${bad ? "FAIL" : "pass"}  ${s.title} / ${s.name}`);
  for (const r of result) console.log(`      ${r}`);
  for (const e of errors) console.log(`      page error: ${e}`);
  await page.close();
}
await browser.close();
server.close();
console.log(`\n${stories.length - failures}/${stories.length} stories pass axe (WCAG 2.2 AA + best practices).`);
process.exit(failures ? 1 : 0);
