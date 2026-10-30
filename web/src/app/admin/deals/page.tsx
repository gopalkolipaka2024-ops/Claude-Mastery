import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dealProducts, deals, products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { addDeal, deleteDeal } from "../actions";
import { AdminShell, Field, btn, btnQuiet, input } from "../ui";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const email = await requireAdmin();
  const d = db("write");
  const [rows, items] = await Promise.all([
    d.select().from(deals).orderBy(desc(deals.endsAt)),
    d.select({ dealId: dealProducts.dealId, name: products.name }).from(dealProducts).innerJoin(products, eq(products.id, dealProducts.productId)),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <AdminShell title="Deals" email={email} sp={await searchParams}>
      <p className="max-w-prose text-text-muted">Deals show on the home page and the Deals page from their start date, and disappear by themselves after the end date. Sale prices themselves come from the POS.</p>
      <form action={addDeal} className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Title"><input name="title" required maxLength={120} className={input} /></Field></div>
        <div className="sm:col-span-2"><Field label="Description (optional)"><input name="description" maxLength={400} className={input} /></Field></div>
        <Field label="Starts"><input type="date" name="startsAt" required defaultValue={today} className={input} /></Field>
        <Field label="Ends"><input type="date" name="endsAt" required className={input} /></Field>
        <div className="sm:col-span-2"><Field label="Products" hint="Paste product web addresses or their last part (e.g. coors-light-30-pk), one per line."><textarea name="products" rows={4} required className="w-full rounded-md border border-border-input bg-surface p-3" /></Field></div>
        <div><button className={btn}>Add deal</button></div>
      </form>
      <ul className="flex flex-col gap-2">
        {rows.length === 0 && <li className="text-text-muted">No deals.</li>}
        {rows.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <span><b>{x.title}</b> <span className="text-sm text-text-muted">{x.startsAt} to {x.endsAt}{x.endsAt < today ? " (ended)" : ""} · {items.filter((i) => i.dealId === x.id).map((i) => i.name).join(", ")}</span></span>
            <form action={deleteDeal}><input type="hidden" name="id" value={x.id} /><button className={btnQuiet}>Remove</button></form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
