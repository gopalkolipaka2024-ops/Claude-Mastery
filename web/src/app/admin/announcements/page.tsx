import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { addAnnouncement, deleteAnnouncement } from "../actions";
import { AdminShell, Field, btn, btnQuiet, input } from "../ui";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const email = await requireAdmin();
  const rows = await db("write").select().from(announcements).orderBy(desc(announcements.id));
  return (
    <AdminShell title="Announcements" email={email} sp={await searchParams}>
      <form action={addAnnouncement} className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Message" hint="Shows in a bar across the top of every page."><input name="text" required maxLength={200} className={input} /></Field></div>
        <Field label="Link (optional)" hint="Starts with / or https://"><input name="href" className={input} /></Field>
        <Field label="Color"><select name="tone" className={input}><option value="brand">Navy</option><option value="info">Blue</option><option value="warning">Yellow</option></select></Field>
        <Field label="Show from (optional)"><input type="date" name="startsAt" className={input} /></Field>
        <Field label="Show until (optional)"><input type="date" name="endsAt" className={input} /></Field>
        <div><button className={btn}>Add announcement</button></div>
      </form>
      <ul className="flex flex-col gap-2">
        {rows.length === 0 && <li className="text-text-muted">No announcements.</li>}
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <span>{a.text}{a.endsAt && <span className="text-sm text-text-muted"> · until {a.endsAt.toISOString().slice(0, 10)}</span>}</span>
            <form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><button className={btnQuiet}>Remove</button></form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
