import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

/** GET /api/v1/categories — the department → category tree with product counts. */
export async function GET() {
  const cat = await getCatalog();
  return NextResponse.json(
    { departments: cat.departments().map((d) => ({ slug: d.slug, name: d.name, count: d.count, categories: d.children })) },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } },
  );
}
