import "server-only";
import { getCatalog } from "./catalog";
import { activeDeals } from "./content";
import { absolute } from "./seo";

/* Sitemap index split by page type. Products are chunked so no file nears the protocol's
   50,000-URL / 50 MB limit as the catalog grows. */
export const PRODUCTS_PER_FILE = 5000;
export const STATIC_PAGES = ["/", "/store", "/deals", "/contact", "/accessibility", "/responsible-drinking", "/privacy", "/terms"];

type Url = { loc: string; lastmod?: string | null; image?: string | null };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const xml = (body: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
  headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
});

export function urlset(urls: Url[]) {
  const rows = urls.map((u) => `<url><loc>${esc(absolute(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}${u.image ? `<image:image><image:loc>${esc(absolute(u.image))}</image:loc></image:image>` : ""}</url>`);
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join("\n")}\n</urlset>`);
}

export async function sitemapFiles() {
  const n = Math.max(1, Math.ceil((await getCatalog()).all().length / PRODUCTS_PER_FILE));
  return ["pages", "categories", ...Array.from({ length: n }, (_, i) => `products-${i + 1}`)];
}

export function sitemapIndex(files: string[]) {
  return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files.map((f) => `<sitemap><loc>${esc(absolute(`/sitemaps/${f}.xml`))}</loc></sitemap>`).join("\n")}\n</sitemapindex>`);
}

export async function sitemapFile(name: string) {
  const cat = await getCatalog();
  if (name === "pages") {
    const hasDeals = (await activeDeals()).length > 0; // the deals page is noindex while empty
    return urlset(STATIC_PAGES.filter((p) => p !== "/deals" || hasDeals).map((loc) => ({ loc })));
  }
  if (name === "categories") return urlset(cat.departments().flatMap((d) => [{ loc: `/c/${d.slug}` }, ...d.children.map((a) => ({ loc: `/c/${d.slug}/${a.slug}` }))]));
  const m = name.match(/^products-(\d+)$/);
  if (!m) return null;
  const page = cat.all().slice((Number(m[1]) - 1) * PRODUCTS_PER_FILE, Number(m[1]) * PRODUCTS_PER_FILE);
  if (!page.length) return null;
  return urlset(page.map((p) => ({ loc: `/p/${p.slug}`, lastmod: p.updatedAt, image: p.image?.src ?? null })));
}
