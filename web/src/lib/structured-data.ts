import type { DayHours } from "@/config/store";
import { directionsUrl, store } from "@/config/store";
import { stockLevel } from "@/config/stock";
import { isOnSale } from "@/components/PriceBlock";
import type { Product } from "./catalog";
import type { Holiday } from "./content";
import { absolute } from "./seo";

/* schema.org JSON-LD built only from real store and catalog data. Anything we don't have
   (price, stock, brand, photo, coordinates) is left out rather than guessed. */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const STORE_ID = () => absolute("/#store");

/** Days with identical hours share one OpeningHoursSpecification; closed days are omitted. */
export function openingHours(week: DayHours[]) {
  const groups = new Map<string, string[]>();
  week.forEach((h, i) => { if (h) { const k = `${h.open}-${h.close}`; groups.set(k, [...(groups.get(k) ?? []), DAYS[i]!]); } });
  return [...groups].map(([k, days]) => {
    const [opens, closes] = k.split("-");
    return { "@type": "OpeningHoursSpecification", dayOfWeek: days.map((d) => `https://schema.org/${d}`), opens, closes };
  });
}

export function storeLd({ week, holidays }: { week: DayHours[]; holidays: Holiday[] }) {
  const a = store.address;
  return {
    "@context": "https://schema.org",
    "@type": "LiquorStore",
    "@id": STORE_ID(),
    name: store.name,
    url: absolute("/"),
    image: absolute("/opengraph-image"),
    telephone: store.phone.e164,
    ...(store.email ? { email: store.email } : {}),
    address: { "@type": "PostalAddress", streetAddress: a.street, addressLocality: a.city, addressRegion: a.region, postalCode: a.postalCode, addressCountry: a.country },
    hasMap: directionsUrl(),
    areaServed: store.neighborhoods.map((n) => ({ "@type": "Place", name: `${n}, ${a.city}, ${a.region}` })),
    openingHoursSpecification: openingHours(week),
    ...(holidays.length ? {
      specialOpeningHoursSpecification: holidays.map((h) => ({
        "@type": "OpeningHoursSpecification", name: h.label, validFrom: h.date, validThrough: h.date,
        opens: h.hours?.open ?? "00:00", closes: h.hours?.close ?? "00:00", // 00:00–00:00 = closed that day
      })),
    } : {}),
  };
}

const AVAILABILITY = { in: "https://schema.org/InStock", low: "https://schema.org/LimitedAvailability", out: "https://schema.org/OutOfStock" } as const;
const dollars = (cents: number) => (cents / 100).toFixed(2);

/**
 * Product + Offer. Search engines treat a Product without an offer, review or rating as invalid,
 * so this returns null until the product has a published price.
 */
export function productLd(p: Product, now = new Date()) {
  if (p.price.regularCents == null) return null;
  const sale = isOnSale(p.price, now);
  const level = stockLevel(p.quantity);
  const gtin = p.upc && /^\d{8}$|^\d{12,14}$/.test(p.upc) ? p.upc : null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url: absolute(`/p/${p.slug}`),
    sku: String(p.id),
    ...(gtin ? { gtin } : {}),
    image: p.image ? absolute(p.image.src) : absolute(`/p/${p.slug}/opengraph-image/card`),
    ...(p.description ? { description: p.description } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    category: p.category,
    ...(p.size ? { size: p.size } : {}),
    ...(p.country ? { countryOfOrigin: p.country } : {}),
    offers: {
      "@type": "Offer",
      url: absolute(`/p/${p.slug}`),
      price: dollars(sale ? p.price.saleCents! : p.price.regularCents),
      priceCurrency: "USD",
      ...(sale && p.price.saleEndsAt ? { priceValidUntil: p.price.saleEndsAt.slice(0, 10) } : {}),
      ...(level ? { availability: AVAILABILITY[level] } : {}),
      itemCondition: "https://schema.org/NewCondition",
      availableAtOrFrom: { "@id": STORE_ID() },
      seller: { "@id": STORE_ID() },
    },
  };
}

export function breadcrumbLd(items: { label: string; href?: string }[], here: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem", position: i + 1, name: c.label, item: absolute(c.href ?? here),
    })),
  };
}
