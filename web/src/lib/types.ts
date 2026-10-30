export type ProductImage = { src: string; alt: string; width: number; height: number };

export type Price = {
  regularCents: number | null; // null = no price published yet
  saleCents?: number | null;
  saleEndsAt?: string | null; // ISO date
};

export type ProductSummary = {
  slug: string;
  name: string;
  brand?: string | null;
  size?: string | null;
  category?: string | null;
  image?: ProductImage | null;
  price: Price;
  quantity?: number | null; // never shown; mapped to a stock badge
};

export type CategoryNode = { name: string; href: string; children?: CategoryNode[] };
