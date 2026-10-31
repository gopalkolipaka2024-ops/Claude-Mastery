import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { syncRuns } from "@/db/schema";

/** The latest sync run of any kind, and the latest successful one. */
export async function syncStatus() {
  const d = db();
  const [[latest], [lastOk]] = await Promise.all([
    d.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1),
    d.select().from(syncRuns).where(eq(syncRuns.status, "ok")).orderBy(desc(syncRuns.finishedAt)).limit(1),
  ]);
  return { latest: latest ?? null, lastOk: lastOk ?? null };
}

