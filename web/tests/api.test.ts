import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as list } from "@/app/api/v1/products/route";
import { GET as one } from "@/app/api/v1/products/[slug]/route";

// Runs against the bundled catalog (no DATABASE_URL in tests), which has no prices or stock.
describe("public API", () => {
  it("lists products with paging and never exposes stock counts", async () => {
    const r = await list(new NextRequest("http://x/api/v1/products?department=beer&limit=5"));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.items).toHaveLength(5);
    expect(j.total).toBeGreaterThan(100);
    expect(JSON.stringify(j)).not.toMatch(/quantity/);
  });
  it("rejects unknown and malformed parameters with a consistent error", async () => {
    for (const q of ["limit=1000", "page=0", "department=..%2F", "secret=1"]) {
      const r = await list(new NextRequest(`http://x/api/v1/products?${q}`));
      expect(r.status).toBe(400);
      expect((await r.json()).error.code).toBe("invalid_request");
    }
  });
  it("returns 404 in the same shape for a missing product", async () => {
    const r = await one(new NextRequest("http://x/api/v1/products/not-a-real-thing"), { params: Promise.resolve({ slug: "not-a-real-thing" }) });
    expect(r.status).toBe(404);
    expect((await r.json()).error.code).toBe("not_found");
  });
});
