import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { featuredProducts, products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { addFeatured, removeFeatured } from "../actions";
import { AdminShell, Field, btn, btnQuiet } from "../ui";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const email = await requireAdmin();
  const rows = await db("write").select({ id: products.id, name: products.name, slug: products.slug }).from(featuredProducts).innerJoin(products, eq(products.id, featuredProducts.productId)).orderBy(asc(featuredProducts.position));
  return (
    <AdminShell title="Featured products" email={email} sp={await searchParams}>
      <form action={addFeatured} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <Field label="Products to feature on the home page" hint="Paste product web addresses or their last part, one per line."><textarea name="products" rows={3} required className="w-full rounded-md border border-border-input bg-surface p-3" /></Field>
        <div><button className={btn}>Add</button></div>
      </form>
      <ol className="flex flex-col gap-2">
        {rows.length === 0 && <li className="text-text-muted">Nothing featured.</li>}
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <a href={`/p/${p.slug}`} className="font-semibold text-primary underline">{p.name}</a>
            <form action={removeFeatured}><input type="hidden" name="id" value={p.id} /><button className={btnQuiet}>Remove</button></form>
          </li>
        ))}
      </ol>
    </AdminShell>
  );
}
