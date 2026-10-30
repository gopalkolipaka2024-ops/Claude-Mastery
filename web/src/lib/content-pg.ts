import "server-only";
import { asc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements, dealProducts, deals, featuredProducts, holidayHours, products, storeHours } from "@/db/schema";
import type { DayHours } from "@/config/store";
import type { Content } from "./content";

export async function loadContent(): Promise<Content> {
  const d = db();
  const today = new Date().toISOString().slice(0, 10);
  const [ann, dealRows, dealItems, feat, week, hol] = await Promise.all([
    d.select().from(announcements).orderBy(asc(announcements.id)),
    d.select().from(deals).where(gte(deals.endsAt, today)).orderBy(asc(deals.endsAt)),
    d.select({ dealId: dealProducts.dealId, slug: products.slug }).from(dealProducts).innerJoin(products, eq(products.id, dealProducts.productId)).where(eq(products.active, true)),
    d.select({ slug: products.slug }).from(featuredProducts).innerJoin(products, eq(products.id, featuredProducts.productId)).where(eq(products.active, true)).orderBy(asc(featuredProducts.position)),
    d.select().from(storeHours),
    d.select().from(holidayHours).where(gte(holidayHours.date, today)).orderBy(asc(holidayHours.date)),
  ]);
  const toHours = (open: string | null, close: string | null): DayHours => (open && close ? { open, close } : null);
  const weekArr: DayHours[] = Array.from({ length: 7 }, (_, i) => { const r = week.find((w) => w.dow === i); return r ? toHours(r.open, r.close) : null; });
  return {
    announcements: ann.map((a) => ({ id: a.id, text: a.text, href: a.href, tone: a.tone as "brand", startsAt: a.startsAt?.toISOString() ?? null, endsAt: a.endsAt?.toISOString() ?? null })),
    deals: dealRows.map((x) => ({ id: x.id, title: x.title, description: x.description, startsAt: x.startsAt, endsAt: x.endsAt, productSlugs: dealItems.filter((i) => i.dealId === x.id).map((i) => i.slug) })),
    featured: feat.map((f) => f.slug),
    week: week.length ? weekArr : [],
    holidays: hol.map((h) => ({ date: h.date, label: h.label, hours: toHours(h.open, h.close) })),
  };
}
