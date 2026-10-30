import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/lib/search";

/** Autocomplete suggestions. Read-only, input-validated, cached briefly at the edge. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ products: [], brands: [], categories: [] });
  if (q.length > 100) return NextResponse.json({ error: "Query too long" }, { status: 400 });
  return NextResponse.json(await suggest(q), { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } });
}
