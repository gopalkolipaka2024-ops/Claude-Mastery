import type { Metadata } from "next";
import Link from "next/link";
import { ListingPage } from "@/components/ListingPage";
import { EmptyState } from "@/components/EmptyState";
import { getCatalog } from "@/lib/catalog";
import { didYouMean, searchIds } from "@/lib/search";
import { store } from "@/config/store";
import { pageMeta } from "@/lib/seo";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = String((await searchParams).q ?? "").trim();
  return pageMeta({ title: q ? `Search: ${q}` : "Search", path: "/search", noindex: true, description: `Search the beer, wine, spirits and grocery products at ${store.name}.` });
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim().slice(0, 100);
  const cat = await getCatalog();
  const all = cat.all();
  const gameDay = /^game ?day$/i.test(q);
  const ids = gameDay ? all.filter((p) => p.gameDay).map((p) => p.id) : q ? await searchIds(q) : [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const set = new Set(ids);
  const products = all.filter((p) => set.has(p.id));
  const aisleNames = Object.fromEntries(cat.departments().flatMap((d) => d.children.map((a) => [a.slug, a.name])));
  const suggestion = q && !products.length ? await didYouMean(q) : null;
  return (
    <ListingPage path="/search" title={q ? `Results for “${q}”` : "Search"} crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]} q={q}
      products={products} searchOrder={order} searchParams={sp} aisleNames={aisleNames}
      empty={
        <EmptyState title={q ? `No matches for “${q}”` : "Search the store"}
          actions={<><Link href="/c/beer" className="inline-flex h-11 items-center rounded-md border border-border-input bg-surface px-4 font-semibold text-primary hover:border-primary">Browse beer</Link><a href={`tel:${store.phone.e164}`} className="inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-on-primary">Call {store.phone.display}</a></>}>
          {suggestion ? <p>Did you mean <Link className="font-semibold text-primary underline" href={`/search?q=${encodeURIComponent(suggestion)}`}>{suggestion}</Link>?</p>
            : <p>{q ? "Try fewer words, a brand, a style like “IPA”, or a size like “30 pk”. Or call and we'll check the shelf." : "Type a product, brand, style or size in the search box."}</p>}
        </EmptyState>
      } />
  );
}
