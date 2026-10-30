import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { searchIds } from "@/lib/search";
import { capabilities, FACET_IDS, parseParams, runListing } from "@/lib/listing";
import { publicProduct } from "@/lib/public-product";
import { apiError, invalid } from "@/lib/api";

const query = z.object({
  q: z.string().trim().max(100).optional(),
  department: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
  category: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
  sort: z.enum(["relevance", "name-asc", "price-asc", "price-desc", "newest"]).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  min: z.coerce.number().min(0).max(99999).optional(),
  max: z.coerce.number().min(0).max(99999).optional(),
  stock: z.literal("in").optional(),
  ...Object.fromEntries(FACET_IDS.map((f) => [f, z.string().max(600).optional()])),
}).strict();

/** GET /api/v1/products — read-only product listing with the same filters as the site. */
export async function GET(req: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return invalid(parsed.error);
  const qp = parsed.data;
  const cat = await getCatalog();
  if (qp.department && !cat.department(qp.department)) return apiError(404, "not_found", `No department "${qp.department}".`);
  let products = cat.productsIn(qp.department, qp.category);
  let order: Map<number, number> | undefined;
  if (qp.q) {
    const ids = await searchIds(qp.q);
    order = new Map(ids.map((id, i) => [id, i]));
    products = products.filter((p) => order!.has(p.id));
  }
  const limit = qp.limit ?? 36, page = qp.page ?? 1;
  const params = parseParams({ ...Object.fromEntries(req.nextUrl.searchParams), page: "1" }, capabilities(products).sorts);
  const aisleNames = Object.fromEntries(cat.departments().flatMap((d) => d.children.map((a) => [a.slug, a.name])));
  const all = runListing(products, { ...params, page: 1_000_000 }, aisleNames, { searchOrder: order });
  const items = all.shown.slice((page - 1) * limit, page * limit).map((p) => publicProduct(p));
  return NextResponse.json(
    { items, total: all.total, page, limit, pages: Math.ceil(all.total / limit), facets: all.facets },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } },
  );
}
