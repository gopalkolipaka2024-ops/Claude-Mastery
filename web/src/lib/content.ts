import "server-only";
import site from "@/content/site.json";
import { hasDatabase } from "@/db/client";
import { store, type DayHours } from "@/config/store";

/* Store-managed content: announcements, deals, featured products and hours.
   From the database (edited in /admin) when configured, otherwise from src/content/site.json
   and src/config/store.ts. Reloads at most every 5 seconds, or right after an admin change. */
export type Announcement = { id: number | string; text: string; href?: string | null; tone?: "brand" | "info" | "warning"; startsAt?: string | null; endsAt?: string | null };
export type Deal = { id: number | string; title: string; description?: string | null; productSlugs: string[]; startsAt: string; endsAt: string };
export type Holiday = { date: string; label: string; hours: DayHours };
export type Content = { announcements: Announcement[]; deals: Deal[]; featured: string[]; week: DayHours[]; holidays: Holiday[] };

// Shared across route bundles (see catalog.ts) so an admin change reaches every page.
const g = globalThis as unknown as { __asmContent?: { cached: { at: number; value: Promise<Content> } | null } };
const state = (g.__asmContent ??= { cached: null });
export function invalidateContent() { state.cached = null; }

async function load(): Promise<Content> {
  if (!hasDatabase()) {
    return {
      announcements: site.announcements as Announcement[], deals: site.deals as Deal[], featured: site.featured as string[],
      week: [...store.hours], holidays: [...store.holidayHours],
    };
  }
  const { loadContent } = await import("./content-pg");
  const c = await loadContent();
  return { ...c, week: c.week.some(Boolean) ? c.week : [...store.hours] };
}

export async function getContent(): Promise<Content> {
  if (!state.cached || Date.now() - state.cached.at > 5_000) state.cached = { at: Date.now(), value: load() };
  try { return await state.cached.value; } catch (e) { state.cached = null; throw e; }
}

const live = (x: { startsAt?: string | null; endsAt?: string | null }, now: Date) =>
  (!x.startsAt || new Date(x.startsAt) <= now) && (!x.endsAt || new Date(x.endsAt.length === 10 ? `${x.endsAt}T23:59:59-05:00` : x.endsAt) >= now);

export const announcements = async (now = new Date()) => (await getContent()).announcements.filter((a) => live(a, now));
/** Only deals running right now; each disappears after its end date with no redeploy. */
export const activeDeals = async (now = new Date()) => (await getContent()).deals.filter((d) => live(d, now));
export const featuredSlugs = async () => (await getContent()).featured;
export const hours = async () => { const c = await getContent(); return { week: c.week, holidays: c.holidays, timeZone: store.timeZone }; };
