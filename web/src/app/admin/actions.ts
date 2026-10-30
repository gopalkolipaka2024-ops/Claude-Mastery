"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements, dealProducts, deals, featuredProducts, holidayHours, products, storeHours } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateContent } from "@/lib/content";
import { revalidateEverything } from "@/lib/cache-tags";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time like 07:00 or 22:00.");
const day = z.iso.date("Use a date like 2026-12-24.");
const back = (path: string, msg: string, ok = true): never => redirect(`${path}?${ok ? "saved" : "error"}=${encodeURIComponent(msg)}`);
const done = (path: string, msg: string) => { invalidateContent(); revalidateEverything(); back(path, msg); };
const field = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v === "" ? undefined : v; };
const firstIssue = (e: z.ZodError) => e.issues[0] ? `${e.issues[0].path.join(".") || "form"}: ${e.issues[0].message}` : "Check the form.";

export async function addAnnouncement(f: FormData) {
  await requireAdmin();
  const r = z.object({ text: z.string().min(3).max(200), href: z.string().max(300).regex(/^(\/|https:\/\/)/, "Links start with / or https://").optional(), tone: z.enum(["brand", "info", "warning"]), startsAt: day.optional(), endsAt: day.optional() })
    .safeParse({ text: field(f, "text"), href: field(f, "href"), tone: field(f, "tone") ?? "brand", startsAt: field(f, "startsAt"), endsAt: field(f, "endsAt") });
  if (!r.success) back("/admin/announcements", firstIssue(r.error), false);
  const v = r.data!;
  await db("write").insert(announcements).values({ text: v.text, href: v.href ?? null, tone: v.tone, startsAt: v.startsAt ? new Date(`${v.startsAt}T00:00:00-05:00`) : null, endsAt: v.endsAt ? new Date(`${v.endsAt}T23:59:59-05:00`) : null });
  done("/admin/announcements", "Announcement added.");
}
export async function deleteAnnouncement(f: FormData) {
  await requireAdmin();
  await db("write").delete(announcements).where(eq(announcements.id, Number(f.get("id"))));
  done("/admin/announcements", "Announcement removed.");
}

async function productIds(slugsText: string | undefined, path: string) {
  const slugs = [...new Set((slugsText ?? "").split(/[\s,]+/).map((s) => s.replace(/^.*\/p\//, "").trim()).filter(Boolean))];
  if (!slugs.length) return [];
  const rows = await db("write").select({ id: products.id, slug: products.slug }).from(products).where(inArray(products.slug, slugs));
  const missing = slugs.filter((s) => !rows.some((r) => r.slug === s));
  if (missing.length) back(path, `These products weren't found: ${missing.slice(0, 5).join(", ")}. Paste the end of the product's web address.`, false);
  return slugs.map((s) => rows.find((r) => r.slug === s)!.id);
}

export async function addDeal(f: FormData) {
  await requireAdmin();
  const r = z.object({ title: z.string().min(3).max(120), description: z.string().max(400).optional(), startsAt: day, endsAt: day })
    .refine((v) => v.endsAt >= v.startsAt, { message: "End date must be on or after the start date.", path: ["endsAt"] })
    .safeParse({ title: field(f, "title"), description: field(f, "description"), startsAt: field(f, "startsAt"), endsAt: field(f, "endsAt") });
  if (!r.success) back("/admin/deals", firstIssue(r.error), false);
  const ids = await productIds(field(f, "products"), "/admin/deals");
  if (!ids.length) back("/admin/deals", "Add at least one product to the deal.", false);
  await db("write").transaction(async (tx) => {
    const [d] = await tx.insert(deals).values({ title: r.data!.title, description: r.data!.description ?? null, startsAt: r.data!.startsAt, endsAt: r.data!.endsAt }).returning({ id: deals.id });
    await tx.insert(dealProducts).values(ids.map((productId) => ({ dealId: d!.id, productId })));
  });
  done("/admin/deals", "Deal added. It shows on the site from its start date and hides after its end date.");
}
export async function deleteDeal(f: FormData) {
  await requireAdmin();
  await db("write").delete(deals).where(eq(deals.id, Number(f.get("id"))));
  done("/admin/deals", "Deal removed.");
}

export async function addFeatured(f: FormData) {
  await requireAdmin();
  const ids = await productIds(field(f, "products"), "/admin/featured");
  if (!ids.length) back("/admin/featured", "Paste at least one product.", false);
  const [{ max } = { max: 0 }] = await db("write").select({ max: sql<number>`coalesce(max(${featuredProducts.position}), 0)` }).from(featuredProducts);
  await db("write").insert(featuredProducts).values(ids.map((productId, i) => ({ productId, position: Number(max) + i + 1 }))).onConflictDoNothing();
  done("/admin/featured", "Featured products updated.");
}
export async function removeFeatured(f: FormData) {
  await requireAdmin();
  await db("write").delete(featuredProducts).where(eq(featuredProducts.productId, Number(f.get("id"))));
  done("/admin/featured", "Removed from featured.");
}

export async function saveWeek(f: FormData) {
  await requireAdmin();
  const rows = [];
  for (let dow = 0; dow < 7; dow++) {
    const closed = f.get(`closed-${dow}`) === "on";
    const open = field(f, `open-${dow}`), close = field(f, `close-${dow}`);
    if (closed) { rows.push({ dow, open: null, close: null }); continue; }
    const r = z.object({ open: time, close: time }).refine((v) => v.close > v.open, "Closing time must be after opening time.").safeParse({ open, close });
    if (!r.success) back("/admin/hours", `Day ${dow + 1}: ${r.error.issues[0]!.message}`, false);
    rows.push({ dow, open: r.data!.open, close: r.data!.close });
  }
  await db("write").insert(storeHours).values(rows).onConflictDoUpdate({ target: storeHours.dow, set: { open: sql`excluded.open`, close: sql`excluded.close` } });
  done("/admin/hours", "Weekly hours saved.");
}
export async function addHoliday(f: FormData) {
  await requireAdmin();
  const closed = f.get("closed") === "on";
  const r = z.object({ date: day, label: z.string().min(2).max(60), open: time.optional(), close: time.optional() })
    .refine((v) => closed || (v.open && v.close && v.close > v.open), "Enter opening and closing times, or tick Closed.")
    .safeParse({ date: field(f, "date"), label: field(f, "label"), open: field(f, "open"), close: field(f, "close") });
  if (!r.success) back("/admin/hours", firstIssue(r.error), false);
  const v = r.data!;
  await db("write").insert(holidayHours).values({ date: v.date, label: v.label, open: closed ? null : v.open!, close: closed ? null : v.close! })
    .onConflictDoUpdate({ target: holidayHours.date, set: { label: v.label, open: closed ? null : v.open!, close: closed ? null : v.close! } });
  done("/admin/hours", "Holiday hours saved.");
}
export async function deleteHoliday(f: FormData) {
  await requireAdmin();
  await db("write").delete(holidayHours).where(eq(holidayHours.date, String(f.get("date"))));
  done("/admin/hours", "Holiday removed.");
}
