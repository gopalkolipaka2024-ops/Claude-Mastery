import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products, syncRuns } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "./ui";

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const email = await requireAdmin();
  const d = db("write");
  const [[counts], runs] = await Promise.all([
    d.select({ active: sql<number>`count(*) filter (where ${products.active})`, hidden: sql<number>`count(*) filter (where not ${products.active})` }).from(products),
    d.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(15),
  ]);
  const lastOk = (await d.select({ at: syncRuns.finishedAt }).from(syncRuns).where(eq(syncRuns.status, "ok")).orderBy(desc(syncRuns.finishedAt)).limit(1))[0]?.at;
  const fmt = (v: Date | null) => (v ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(v) : "—");
  return (
    <AdminShell title="Overview" email={email} sp={await searchParams}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4"><p className="text-sm text-text-muted">Products on the site</p><p className="font-display text-4xl text-primary">{Number(counts?.active ?? 0).toLocaleString()}</p></div>
        <div className="rounded-lg border border-border bg-surface p-4"><p className="text-sm text-text-muted">Hidden (no longer in the POS)</p><p className="font-display text-4xl text-primary">{Number(counts?.hidden ?? 0).toLocaleString()}</p></div>
        <div className="rounded-lg border border-border bg-surface p-4"><p className="text-sm text-text-muted">Last successful sync</p><p className="font-display text-2xl text-primary">{fmt(lastOk ?? null)}</p></div>
      </div>
      <section aria-labelledby="runs-h">
        <h2 id="runs-h" className="text-2xl text-primary">Recent syncs</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-text-muted"><th className="py-2 pr-3">Started</th><th className="pr-3">Kind</th><th className="pr-3">Status</th><th className="pr-3 text-right">Created</th><th className="pr-3 text-right">Updated</th><th className="pr-3 text-right">Hidden</th><th>Error</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmt(r.startedAt)}</td><td className="pr-3">{r.kind} · {r.source}</td>
                  <td className="pr-3"><span className={r.status === "ok" ? "text-success-700" : r.status === "failed" ? "font-semibold text-danger-700" : "text-warning-700"}>{r.status}</span></td>
                  <td className="pr-3 text-right tabular-nums">{r.created}</td><td className="pr-3 text-right tabular-nums">{r.updated}</td><td className="pr-3 text-right tabular-nums">{r.deactivated}</td>
                  <td className="max-w-xs truncate text-danger-700" title={r.error ?? ""}>{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
