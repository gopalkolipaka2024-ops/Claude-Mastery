import { stockLevel } from "@/config/stock";
import { isOnSale } from "@/components/PriceBlock";
import type { Product } from "./catalog";

const AVAIL = { in: "in_stock", low: "low_stock", out: "out_of_stock" } as const;

/** What the public API exposes about a product. Stock is a level, never a count. */
export function publicProduct(p: Product, now = new Date()) {
  const sale = isOnSale(p.price, now);
  const level = stockLevel(p.quantity);
  return {
    slug: p.slug, name: p.name, url: `/p/${p.slug}`, brand: p.brand,
    department: p.dept, category: p.aisle, categoryName: p.category,
    size: p.size, pack: p.pack, volume: p.volume, upc: p.upc,
    price: p.price.regularCents == null ? null : {
      currency: "USD", regular: p.price.regularCents / 100, current: (sale ? p.price.saleCents! : p.price.regularCents) / 100,
      onSale: sale, saleEndsAt: sale ? p.price.saleEndsAt ?? null : null,
    },
    availability: level ? AVAIL[level] : null,
    image: p.image, abv: p.abv, country: p.country, region: p.region, varietal: p.varietal, description: p.description,
    updatedAt: p.updatedAt,
  };
}
