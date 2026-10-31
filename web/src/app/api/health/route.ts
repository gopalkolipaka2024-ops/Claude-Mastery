import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { hasDatabase } from "@/db/client";
import { release } from "@/lib/log";

export const dynamic = "force-dynamic";

/*
  GET /api/health — for uptime monitors. Point the monitor at this URL and alert unless the
  response contains "status":"ok".
    200 ok        everything works
    200 degraded  the site works, but the last successful catalog sync is older than
                  SYNC_STALE_HOURS (default 36), or the latest sync failed
    503 down      the catalog can't be loaded or the database doesn't answer
*/
export async function GET() {
  const checks: Record<string, unknown> = {};
  let status: "ok" | "degraded" | "down" = "ok";
  const problems: string[] = [];
  try {
    const cat = await getCatalog();
    checks.catalog = { source: cat.source, products: cat.all().length, version: cat.version };
    if (!cat.all().length) { status = "down"; problems.push("catalog is empty"); }
  } catch {
    status = "down"; problems.push("catalog can't be loaded");
  }
  if (hasDatabase()) {
    try {
      const { syncStatus } = await import("@/lib/sync-status");
      const { latest, lastOk } = await syncStatus();
      const staleHours = Number(process.env.SYNC_STALE_HOURS ?? 36);
      const age = lastOk?.finishedAt ? (Date.now() - lastOk.finishedAt.getTime()) / 3_600_000 : null;
      checks.database = "ok";
      checks.sync = { lastOkAt: lastOk?.finishedAt ?? null, lastOkAgeHours: age == null ? null : Math.round(age * 10) / 10, latestStatus: latest?.status ?? null, latestAt: latest?.startedAt ?? null };
      if (age == null || age > staleHours) { if (status === "ok") status = "degraded"; problems.push(`no successful sync in ${staleHours} hours`); }
      if (latest?.status === "failed") { if (status === "ok") status = "degraded"; problems.push("latest sync failed"); }
    } catch {
      status = "down"; checks.database = "unreachable"; problems.push("database unreachable");
    }
  } else {
    checks.database = "not configured";
  }
  return NextResponse.json(
    { status, problems, checks, release: release(), time: new Date().toISOString() },
    { status: status === "down" ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
