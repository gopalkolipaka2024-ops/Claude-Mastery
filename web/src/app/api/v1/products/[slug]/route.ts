import { NextResponse, type NextRequest } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { publicProduct } from "@/lib/public-product";
import { apiError } from "@/lib/api";

/** GET /api/v1/products/:slug — one product. Renamed products answer 301 to the new slug. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return apiError(400, "invalid_request", "Slug may only contain a-z, 0-9 and dashes.");
  const cat = await getCatalog();
  const p = cat.product(slug);
  if (!p) {
    const moved = cat.redirect(slug);
    if (moved) return NextResponse.redirect(new URL(`/api/v1/products/${moved}`, req.url), 301);
    return apiError(404, "not_found", `No product "${slug}".`);
  }
  return NextResponse.json(publicProduct(p), { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } });
}
