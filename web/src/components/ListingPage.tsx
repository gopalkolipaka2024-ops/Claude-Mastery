import type { ReactNode } from "react";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { capabilities, FACET_IDS, PAGE_SIZE, parseParams, runListing, type Sort } from "@/lib/listing";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { ProductGrid } from "./ProductGrid";
import { FilterLinks, listingHref } from "./FilterLinks";
import { ListingSheet } from "./ListingSheet";
import { SortSelect } from "./SortSelect";
import { EmptyState } from "./EmptyState";

type SP = Record<string, string | string[] | undefined>;
const SORT_LABELS: Record<Sort, string> = {
  relevance: "Most relevant", "name-asc": "Name: A to Z", "price-asc": "Price: low to high", "price-desc": "Price: high to low", newest: "Newest",
};

/** Category and search results share this layout: sticky filter rail on desktop, bottom-sheet filters on mobile.
    Filters and Load more are plain links rendered on the server, so the page ships almost no JavaScript. */
export function ListingPage({ title, crumbs, path, products, searchParams, aisleNames, q, searchOrder, intro, empty }: {
  title: string; crumbs: Crumb[]; path: string; products: Product[]; searchParams: SP; aisleNames: Record<string, string>;
  q?: string; searchOrder?: Map<number, number>; intro?: ReactNode; empty?: ReactNode;
}) {
  const cap = capabilities(products);
  const params = parseParams(searchParams, cap.sorts);
  const { total, shown, facets } = runListing(products, params, aisleNames, { searchOrder });
  // One element used in both the desktop rail and the phone sheet, so it is sent to the browser once
  const filters = <FilterLinks facets={facets} params={params} path={path} q={q} showStock={cap.stock} showPrice={cap.priced} />;
  const active = FACET_IDS.reduce((n, f) => n + params[f].length, 0) + (params.inStock ? 1 : 0) + (params.min != null || params.max != null ? 1 : 0);
  const sortHrefs = Object.fromEntries(cap.sorts.map((s) => [s, listingHref(path, params, q, { sort: s })]));
  const remaining = total - shown.length;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={crumbs} here={path} />
      <div className="mt-3 flex flex-col gap-1">
        <h1 className="text-4xl text-primary sm:text-5xl">{title}</h1>
        {intro}
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-44 max-h-[calc(100dvh-12rem)] overflow-y-auto pr-2">
            {filters}
          </div>
        </aside>
        <div className="min-w-0">
          <h2 className="sr-only">Products</h2>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted" aria-live="polite">{total.toLocaleString()} {total === 1 ? "product" : "products"}</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="lg:hidden"><ListingSheet active={active} total={total}><div className="[&_.filter-head:not(:has(a))]:hidden [&_.filter-title]:hidden">{filters}</div></ListingSheet></div>
              {cap.sorts.length > 1 && <SortSelect value={params.sort} options={cap.sorts.map((s) => ({ value: s, label: SORT_LABELS[s] }))} hrefs={sortHrefs} />}
            </div>
          </div>
          {total === 0 ? (empty ?? <EmptyState title="No products match these filters">{active ? "Try removing a filter." : "Nothing here yet."}</EmptyState>) : (
            <>
              <ProductGrid products={shown} />
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-sm text-text-muted">Showing {shown.length.toLocaleString()} of {total.toLocaleString()} products</p>
                {remaining > 0 && (
                  <Link href={listingHref(path, params, q, { page: params.page + 1 })} rel="next" scroll={false} prefetch={false}
                    className="inline-flex h-12 items-center rounded-md border border-border-input bg-surface px-6 text-lg font-semibold text-primary hover:border-primary hover:bg-brand-50">
                    Load {Math.min(remaining, PAGE_SIZE)} more
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
