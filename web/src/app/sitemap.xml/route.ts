import { sitemapFiles, sitemapIndex } from "@/lib/sitemap";

export const revalidate = 3600;
export async function GET() {
  return sitemapIndex(await sitemapFiles());
}
