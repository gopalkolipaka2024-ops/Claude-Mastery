import type { Metadata } from "next";
import { store } from "@/config/store";

/** Public origin of the site, from SITE_URL (no trailing slash). */
export const siteUrl = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const absolute = (path: string) => (/^https?:/.test(path) ? path : siteUrl() + path);

/**
 * Title, description, canonical URL and social cards for one page. Social images come from the
 * opengraph-image files (site-wide, or per product). `noindex` keeps a page out of search results
 * while still letting crawlers follow its links (used for filtered and paged listings).
 */
export function pageMeta({ title, description, path, noindex = false, type = "website" }: {
  title?: string; description: string; path: string; noindex?: boolean; type?: "website" | "article";
}): Metadata {
  const full = title ? `${title} | ${store.name}` : store.name;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, siteName: store.name, locale: "en_US", type },
    twitter: { card: "summary_large_image", title: full, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** The parts of a product's size its name doesn't already say ("Coors Light 30 pk" + "30 pk, 12 oz" → "12 oz"). */
export const sizeBeyondName = (p: { name: string; size: string | null }) =>
  (p.size ?? "").split(", ").filter((part) => part && !p.name.toLowerCase().includes(part.toLowerCase())).join(", ") || null;

/** Listing URLs with any filter, sort, price range or page number are thin variations of the
    plain category page: kept out of the index, canonical to the clean URL. */
export const isRefinedListing = (sp: Record<string, string | string[] | undefined>) =>
  Object.entries(sp).some(([k, v]) => k !== "q" && v != null && v !== "");
