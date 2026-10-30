import { describe, expect, it } from "vitest";
import { isOnSale } from "@/components/PriceBlock";
import { stockLevel, STOCK_THRESHOLDS } from "@/config/stock";

const now = new Date("2026-11-10T12:00:00-05:00");

describe("sale price", () => {
  it("shows while the sale is running", () => {
    expect(isOnSale({ regularCents: 2899, saleCents: 2599, saleStartsAt: "2026-11-01T00:00:00-05:00", saleEndsAt: "2026-11-15T23:59:59-05:00" }, now)).toBe(true);
  });
  it("hides before the start and after the end", () => {
    expect(isOnSale({ regularCents: 2899, saleCents: 2599, saleStartsAt: "2026-11-11T00:00:00-05:00" }, now)).toBe(false);
    expect(isOnSale({ regularCents: 2899, saleCents: 2599, saleEndsAt: "2026-11-09T23:59:59-05:00" }, now)).toBe(false);
  });
  it("ignores a 'sale' that isn't cheaper, or a missing regular price", () => {
    expect(isOnSale({ regularCents: 2599, saleCents: 2599 }, now)).toBe(false);
    expect(isOnSale({ regularCents: null, saleCents: 100 }, now)).toBe(false);
  });
});

describe("stock badge", () => {
  it("maps counts to levels and never needs the count itself", () => {
    expect(stockLevel(0)).toBe("out");
    expect(stockLevel(-2)).toBe("out");
    expect(stockLevel(1)).toBe("low");
    expect(stockLevel(STOCK_THRESHOLDS.low)).toBe("low");
    expect(stockLevel(STOCK_THRESHOLDS.low + 1)).toBe("in");
    expect(stockLevel(null)).toBeNull();
  });
});
