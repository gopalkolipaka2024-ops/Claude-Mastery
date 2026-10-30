import { beforeAll, describe, expect, it } from "vitest";
import type { Product } from "@/lib/catalog";
import { breadcrumbLd, openingHours, productLd, storeLd } from "@/lib/structured-data";
import { isRefinedListing, pageMeta } from "@/lib/seo";
import { store } from "@/config/store";

beforeAll(() => { process.env.SITE_URL = "https://shop.example/"; });
const now = new Date("2026-11-10T12:00:00-05:00");
const base: Product = {
  id: 42, slug: "coors-light-30-pk", name: "Coors Light 30 pk", rank: 1, dept: "beer", aisle: "light-beer", category: "Light Beer",
  brand: null, size: "30 pk, 12 oz", pack: "30 pk", volume: "12 oz", upc: null, price: { regularCents: null }, quantity: null, image: null,
  description: null, abv: null, country: null, region: null, varietal: null, gameDay: false,
  art: { id: 42, name: "Coors Light 30 pk", dept: "beer", aisle: "Light Beer", shape: "case", body: "#fff", ink: "#000", flv: "" }, createdAt: null, updatedAt: null,
};

describe("Product structured data", () => {
  it("is omitted until the product has a price (never invented)", () => {
    expect(productLd(base, now)).toBeNull();
  });
  it("uses the sale price while the sale runs, with its end date", () => {
    const ld = productLd({ ...base, price: { regularCents: 2899, saleCents: 2599, saleEndsAt: "2026-11-15T23:59:59-05:00" } }, now)!;
    expect(ld.offers).toMatchObject({ price: "25.99", priceCurrency: "USD", priceValidUntil: "2026-11-15" });
  });
  it("maps stock to schema.org availability and leaves it out when unknown", () => {
    const at = (quantity: number | null) => (productLd({ ...base, quantity, price: { regularCents: 2899 } }, now)!.offers as Record<string, unknown>).availability;
    expect(at(40)).toBe("https://schema.org/InStock");
    expect(at(2)).toBe("https://schema.org/LimitedAvailability");
    expect(at(0)).toBe("https://schema.org/OutOfStock");
    expect(at(null)).toBeUndefined();
  });
  it("adds GTIN only for valid UPC/EAN lengths, and brand only when known", () => {
    const ld = productLd({ ...base, upc: "071990095154", brand: "Coors", price: { regularCents: 2899 } }, now)!;
    expect(ld).toMatchObject({ gtin: "071990095154", brand: { name: "Coors" }, url: "https://shop.example/p/coors-light-30-pk" });
    expect(productLd({ ...base, upc: "123", price: { regularCents: 2899 } }, now)).not.toHaveProperty("gtin");
  });
});

describe("Store structured data", () => {
  it("groups days with the same hours and skips closed days", () => {
    const spec = openingHours([null, { open: "07:00", close: "22:00" }, { open: "07:00", close: "22:00" }, null, null, null, { open: "09:00", close: "20:00" }]);
    expect(spec).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["https://schema.org/Monday", "https://schema.org/Tuesday"], opens: "07:00", closes: "22:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["https://schema.org/Saturday"], opens: "09:00", closes: "20:00" },
    ]);
  });
  it("uses the real store facts and marks holiday closures", () => {
    const ld = storeLd({ week: store.hours as never, holidays: [{ date: "2026-12-25", label: "Christmas", hours: null }] });
    expect(ld).toMatchObject({ "@type": "LiquorStore", telephone: "+16174726455", address: { streetAddress: "494 Sea St #55", postalCode: "02169" } });
    expect(ld.specialOpeningHoursSpecification).toEqual([expect.objectContaining({ validFrom: "2026-12-25", opens: "00:00", closes: "00:00" })]);
    expect(ld).not.toHaveProperty("geo"); // no coordinates on file
  });
});

describe("Breadcrumbs and indexing rules", () => {
  it("builds absolute breadcrumb URLs, the last one being the current page", () => {
    const ld = breadcrumbLd([{ label: "Home", href: "/" }, { label: "Beer & Seltzers" }], "/c/beer");
    expect(ld.itemListElement.map((i) => i.item)).toEqual(["https://shop.example/", "https://shop.example/c/beer"]);
  });
  it("noindexes filtered, sorted and paged listings but not the plain category", () => {
    expect(isRefinedListing({})).toBe(false);
    expect(isRefinedListing({ aisle: "light-beer" })).toBe(true);
    expect(isRefinedListing({ sort: "name-asc" })).toBe(true);
    expect(isRefinedListing({ page: "2" })).toBe(true);
    expect(pageMeta({ title: "Beer", path: "/c/beer", description: "x", noindex: true }).robots).toEqual({ index: false, follow: true });
    expect(pageMeta({ title: "Beer", path: "/c/beer", description: "x" }).alternates).toEqual({ canonical: "/c/beer" });
  });
});

describe("size wording", () => {
  it("doesn't repeat what the product name already says", async () => {
    const { sizeBeyondName } = await import("@/lib/seo");
    expect(sizeBeyondName({ name: "Coors Light 30 pk", size: "30 pk" })).toBeNull();
    expect(sizeBeyondName({ name: "Coors Light 30 pk", size: "30 pk, 12 oz" })).toBe("12 oz");
    expect(sizeBeyondName({ name: "Tito's Vodka", size: "750 ml" })).toBe("750 ml");
  });
});
