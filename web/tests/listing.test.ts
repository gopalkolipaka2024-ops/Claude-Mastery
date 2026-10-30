import { describe, expect, it } from "vitest";
import { capabilities, parseParams, priceNow, runListing } from "@/lib/listing";
import type { Product } from "@/lib/catalog";

let id = 0;
const p = (over: Partial<Product>): Product => ({
  id: ++id, slug: `p${id}`, name: `Item ${id}`, rank: id, dept: "beer", aisle: "light-beer", category: "Light beer",
  brand: null, size: null, pack: null, volume: null, upc: null, price: { regularCents: null }, quantity: null, image: null,
  description: null, abv: null, country: null, region: null, varietal: null, gameDay: false,
  art: { id, name: "", dept: "", aisle: "", shape: "", body: "", ink: "", flv: "" }, createdAt: null, updatedAt: null, ...over,
});
const items = [
  p({ name: "Coors Light 30 pk", pack: "30 pk", brand: "Coors", price: { regularCents: 2899, saleCents: 2599 }, quantity: 3 }),
  p({ name: "Miller Lite 30 pk", pack: "30 pk", brand: "Miller", price: { regularCents: 2799 }, quantity: 40 }),
  p({ name: "Bud Light 12 pk", pack: "12 pk", brand: "Bud", price: { regularCents: 1599 }, quantity: 0 }),
  p({ name: "Corona Extra 12 pk", pack: "12 pk", brand: "Corona", aisle: "imported", category: "Imported", price: { regularCents: null } }),
];
const names = { "light-beer": "Light beer", imported: "Imported" };

describe("listing", () => {
  it("counts a facet as if its own selection were cleared", () => {
    const params = parseParams({ pack: "30 pk" }, capabilities(items).sorts);
    const r = runListing(items, params, names);
    expect(r.total).toBe(2);
    const pack = r.facets.find((f) => f.id === "pack")!;
    expect(pack.options.find((o) => o.value === "12 pk")!.count).toBe(2); // still selectable
    const brand = r.facets.find((f) => f.id === "brand")!;
    expect(brand.options.map((o) => o.value).sort()).toEqual(["Coors", "Miller"]);
  });
  it("filters by current price (sale price while it runs) and in-stock", () => {
    const r = runListing(items, parseParams({ max: "26", stock: "in" }, ["relevance"]), names);
    expect(r.shown.map((x) => x.name)).toEqual(["Coors Light 30 pk"]); // Miller is over $26, Bud is out of stock, Corona has no price
    expect(priceNow(items[0]!)).toBe(2599);
  });
  it("sorts by price with unpriced items last", () => {
    const r = runListing(items, parseParams({ sort: "price-asc" }, capabilities(items).sorts), names);
    expect(r.shown.map((x) => x.name)).toEqual(["Bud Light 12 pk", "Coors Light 30 pk", "Miller Lite 30 pk", "Corona Extra 12 pk"]);
  });
  it("only offers sorts the data supports", () => {
    expect(capabilities([p({})]).sorts).toEqual(["relevance", "name-asc"]);
    expect(capabilities(items).sorts).toContain("price-asc");
  });
  it("ignores junk in the URL", () => {
    const params = parseParams({ sort: "drop table", page: "-4", min: "abc" }, ["relevance"]);
    expect(params).toMatchObject({ sort: "relevance", page: 1, min: null });
  });
});
