import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ProductGrid } from "@/components/ProductGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getCatalog } from "@/lib/catalog";
import { activeDeals } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { store } from "@/config/store";

// With no deals posted the page is just an empty state, so it stays out of the index until one is live.
export async function generateMetadata(): Promise<Metadata> {
  const live = (await activeDeals()).length > 0;
  return pageMeta({ title: "Deals", path: "/deals", noindex: !live, description: `Current deals on beer, wine, spirits and groceries at ${store.name}, ${store.address.street.replace(/ #.*/, "")}, ${store.address.city}, ${store.address.region}.` });
}
export const revalidate = 300; // deals expire on their end date without a redeploy

export default async function DealsPage() {
  const [cat, deals] = await Promise.all([getCatalog(), activeDeals()]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs here="/deals" items={[{ label: "Home", href: "/" }, { label: "Deals" }]} />
      <h1 className="mt-3 text-5xl text-primary">Deals</h1>
      {deals.length === 0 ? (
        <EmptyState icon="tag" title="No deals posted right now"
          actions={<Link href="/" className="inline-flex h-11 items-center rounded-md border border-border-input bg-surface px-4 font-semibold text-primary hover:border-primary">Browse the store</Link>}>
          Ask at the counter about in-store specials.
        </EmptyState>
      ) : deals.map((d) => {
        const items = d.productSlugs.map(cat.product).filter((p) => !!p);
        return (
          <section key={d.id} className="mt-8" aria-labelledby={`deal-${d.id}`}>
            <h2 id={`deal-${d.id}`} className="text-3xl text-primary">{d.title}</h2>
            <p className="text-text-muted">{d.description} Ends {formatDate(d.endsAt)}.</p>
            <div className="mt-4"><ProductGrid products={items} /></div>
          </section>
        );
      })}
    </div>
  );
}
