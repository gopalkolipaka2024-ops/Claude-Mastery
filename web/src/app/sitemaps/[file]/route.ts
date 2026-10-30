import { sitemapFile } from "@/lib/sitemap";
import { apiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = (await params).file.replace(/\.xml$/, "");
  return (await sitemapFile(name)) ?? apiError(404, "not_found", "No such sitemap.");
}
