import { getCatalog } from "@/lib/catalog";
import { artUrl } from "@/lib/art-url";
import { standaloneArt } from "@/lib/package-art-svg";
import { apiError } from "@/lib/api";

/* Package drawings as standalone SVG files, so listing pages stay small and browsers/CDN
   cache each drawing once. The URL carries a hash of the drawing's inputs, so it can be
   cached forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const m = (await params).file.match(/^(\d+)-[a-z0-9]+\.svg$/);
  if (!m) return apiError(400, "invalid_request", "Expected /art/<id>-<hash>.svg");
  const p = (await getCatalog()).productById(Number(m[1]));
  if (!p) return apiError(404, "not_found", "No such product.");
  const current = artUrl(p.art);
  if (!current.endsWith(`/${(await params).file}`)) return Response.redirect(new URL(current, _req.url), 301);
  const svg = standaloneArt(p.art);
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
