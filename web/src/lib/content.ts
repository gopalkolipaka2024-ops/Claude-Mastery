import "server-only";
import site from "@/content/site.json";

/* Site content managed by the store (banners, deals, featured products, announcements).
   Phase 3 replaces the JSON file with the admin area; the shapes stay the same. */
export type Announcement = { id: string; text: string; href?: string; tone?: "brand" | "info" | "warning"; startsAt?: string; endsAt?: string };
export type Deal = { id: string; title: string; description?: string; productSlugs: string[]; startsAt: string; endsAt: string };

const live = (x: { startsAt?: string; endsAt?: string }, now: Date) =>
  (!x.startsAt || new Date(x.startsAt) <= now) && (!x.endsAt || new Date(`${x.endsAt}T23:59:59`) >= now);

export const announcements = (now = new Date()) => (site.announcements as Announcement[]).filter((a) => live(a, now));
/** Only deals that are running right now; they disappear after their end date. */
export const activeDeals = (now = new Date()) => (site.deals as Deal[]).filter((d) => live(d, now));
export const featuredSlugs = () => site.featured as string[];
