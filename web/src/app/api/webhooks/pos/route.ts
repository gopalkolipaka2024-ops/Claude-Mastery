import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { applyItems } from "@/sync/apply";
import { posUpdate } from "@/sync/types";
import { apiError, invalid, verifySignature } from "@/lib/api";
import { revalidateChanges } from "@/lib/cache-tags";
import { invalidateCatalog } from "@/lib/catalog";

export const runtime = "nodejs";
const body = z.object({ items: z.array(posUpdate).min(1).max(500) });

/**
 * Point-of-sale change feed. POST { items: [{ sku, priceCents?, saleCents?, saleEndsAt?, quantity?, active?, ... }] }
 * signed with POS_WEBHOOK_SECRET (see src/lib/api.ts). Applies the changes, then refreshes only the
 * affected product and department pages.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.POS_WEBHOOK_SECRET;
  if (!secret) return apiError(503, "not_configured", "The webhook isn't configured on this site.");
  const raw = await req.text();
  if (raw.length > 1_000_000) return apiError(413, "too_large", "Request body is over 1 MB.");
  const bad = verifySignature(secret, raw, req.headers.get("x-asm-timestamp"), req.headers.get("x-asm-signature"));
  if (bad) return apiError(401, "bad_signature", `Request rejected: ${bad}.`);
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return apiError(400, "invalid_json", "Body is not valid JSON."); }
  const parsed = body.safeParse(json);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const r = await applyItems(db("write"), parsed.data.items, { source: "webhook", kind: "webhook" });
    invalidateCatalog();
    revalidateChanges(r.changedSlugs, r.changedDepartments);
    console.log(JSON.stringify({ msg: "webhook applied", runId: r.runId, created: r.created, updated: r.updated, unchanged: r.unchanged, unknown: r.unknownSkus.length }));
    return NextResponse.json({ ok: true, runId: r.runId, created: r.created, updated: r.updated, unchanged: r.unchanged, unknownSkus: r.unknownSkus });
  } catch (e) {
    console.error(JSON.stringify({ msg: "webhook failed", error: String((e as Error).message ?? e) }));
    return apiError(500, "sync_failed", "The changes couldn't be saved. Nothing was applied; retry the request.");
  }
}
