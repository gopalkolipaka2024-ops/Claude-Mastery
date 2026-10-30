export type ProductImage = { src: string; alt: string; width: number; height: number };

export type Price = {
  regularCents: number | null; // null = no price published yet
  saleCents?: number | null;
  saleStartsAt?: string | null; // ISO date; sale shows from this moment
  saleEndsAt?: string | null; // ISO date; sale stops showing after this moment
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
