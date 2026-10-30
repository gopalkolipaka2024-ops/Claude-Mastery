import type { MetadataRoute } from "next";
import { absolute } from "@/lib/seo";

/* Until launch (SITE_INDEXABLE=1 at build time) every crawler is turned away. After launch,
   filtered listings and search stay crawlable so crawlers can see their noindex tags. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_INDEXABLE !== "1") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: absolute("/sitemap.xml"),
  };
}
