import { getCatalog } from "@/lib/catalog";
import { packageArt } from "@/lib/package-art";
import { artUrl } from "@/lib/art-url";
import { DEFS } from "@/components/PackageArtDefs";
import { apiError } from "@/lib/api";

/* Package drawings as standalone SVG files, so listing pages stay small and browsers/CDN
   cache each drawing once. The URL carries a hash of the drawing's inputs, so it can be
   cached forever. Images can't use the page's web fonts; labels use condensed system fonts
   and are already stretched to fit. */
const STYLE = `<style>.lb,.ls{font-family:'Arial Narrow','Roboto Condensed','Helvetica Neue',Arial,sans-serif;font-weight:800;font-stretch:condensed}.ls{font-style:italic}.lt,.lsr{font-family:'Helvetica Neue',Roboto,Arial,sans-serif;font-weight:700}.sweep,.drip,.bub{display:none}</style>`;

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const m = (await params).file.match(/^(\d+)-[a-z0-9]+\.svg$/);
  if (!m) return apiError(400, "invalid_request", "Expected /art/<id>-<hash>.svg");
  const p = (await getCatalog()).productById(Number(m[1]));
  if (!p) return apiError(404, "not_found", "No such product.");
  const current = artUrl(p.art);
  if (!current.endsWith(`/${(await params).file}`)) return Response.redirect(new URL(current, _req.url), 301);
  const svg = packageArt(p.art).replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" `).replace(/(<svg[^>]*>)/, `$1${STYLE}${DEFS}`);
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
