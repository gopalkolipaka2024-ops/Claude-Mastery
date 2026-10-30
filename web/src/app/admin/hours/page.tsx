import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { holidayHours, storeHours } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { DAY_NAMES } from "@/lib/hours";
import { store } from "@/config/store";
import { addHoliday, deleteHoliday, saveWeek } from "../actions";
import { AdminShell, Field, btn, btnQuiet, input } from "../ui";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const email = await requireAdmin();
  const d = db("write");
  const [week, hols] = await Promise.all([d.select().from(storeHours), d.select().from(holidayHours).orderBy(asc(holidayHours.date))]);
  const day = (i: number) => week.find((w) => w.dow === i) ?? (store.hours[i] ? { open: store.hours[i]!.open, close: store.hours[i]!.close } : { open: null, close: null });
  return (
    <AdminShell title="Store hours" email={email} sp={await searchParams}>
      <form action={saveWeek} className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-2xl text-primary">Every week</h2>
        <table className="mt-3 w-full">
          <thead><tr className="text-left text-sm text-text-muted"><th className="pb-2">Day</th><th>Opens</th><th>Closes</th><th>Closed</th></tr></thead>
          <tbody>
            {DAY_NAMES.map((n, i) => {
              const h = day(i);
              return (
                <tr key={n} className="border-t border-border">
                  <th scope="row" className="py-2 pr-3 text-left">{n}</th>
                  <td className="pr-2"><input type="time" name={`open-${i}`} defaultValue={h.open ?? ""} aria-label={`${n} opens`} className={input} /></td>
                  <td className="pr-2"><input type="time" name={`close-${i}`} defaultValue={h.close ?? ""} aria-label={`${n} closes`} className={input} /></td>
                  <td><input type="checkbox" name={`closed-${i}`} defaultChecked={!h.open} aria-label={`Closed on ${n}`} className="size-5" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className={`${btn} mt-4`}>Save weekly hours</button>
      </form>
      <form action={addHoliday} className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-5 sm:items-end">
        <h2 className="text-2xl text-primary sm:col-span-5">Holiday hours</h2>
        <Field label="Date"><input type="date" name="date" required className={input} /></Field>
        <Field label="Holiday"><input name="label" required maxLength={60} placeholder="Thanksgiving" className={input} /></Field>
        <Field label="Opens"><input type="time" name="open" className={input} /></Field>
        <Field label="Closes"><input type="time" name="close" className={input} /></Field>
        <label className="flex h-11 items-center gap-2 font-semibold"><input type="checkbox" name="closed" className="size-5" />Closed</label>
        <div className="sm:col-span-5"><button className={btn}>Save holiday</button></div>
      </form>
      <ul className="flex flex-col gap-2">
        {hols.map((h) => (
          <li key={h.date} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <span><b>{h.label}</b> · {h.date} · {h.open ? `${h.open} to ${h.close}` : "Closed"}</span>
            <form action={deleteHoliday}><input type="hidden" name="date" value={h.date} /><button className={btnQuiet}>Remove</button></form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
