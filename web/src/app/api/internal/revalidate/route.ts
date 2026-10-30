import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, invalid, safeEqual } from "@/lib/api";
import { invalidateCatalog } from "@/lib/catalog";
import { invalidateContent } from "@/lib/content";
import { revalidateChanges, revalidateEverything } from "@/lib/cache-tags";

/** { all: true } refreshes every page; { products: [slug, ...] } refreshes just those product pages. */
const body = z.object({ all: z.boolean().optional(), products: z.array(z.string().regex(/^[a-z0-9-]+$/).max(200)).max(2000).optional() }).refine((b) => b.all || b.products?.length, "Send all: true or a list of product slugs.");

/** Called by the scheduled sync (which runs outside the site) to refresh cached pages. Bearer REVALIDATE_TOKEN. */
export async function POST(req: NextRequest) {
  const token = process.env.REVALIDATE_TOKEN;
  if (!token) return apiError(503, "not_configured", "Revalidation isn't configured on this site.");
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${token}`)) return apiError(401, "unauthorized", "Missing or wrong token.");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  invalidateCatalog();
  invalidateContent();
  if (parsed.data.all) revalidateEverything(); else revalidateChanges(parsed.data.products ?? [], []);
  return NextResponse.json({ ok: true, revalidated: parsed.data.all ? "all" : parsed.data.products!.length });
}
