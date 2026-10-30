import type { ReactNode } from "react";
import type { Product } from "@/lib/catalog";
import { capabilities, FACET_IDS, parseParams, runListing } from "@/lib/listing";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { ProductGrid } from "./ProductGrid";
import { ListingFilters, ListingLoadMore, ListingSort } from "./ListingControls";
import { EmptyState } from "./EmptyState";

type SP = Record<string, string | string[] | undefined>;

/** Category and search results share this layout: sticky filter rail on desktop, bottom-sheet filters on mobile. */
export function ListingPage({ title, crumbs, products, searchParams, aisleNames, q, searchOrder, intro, empty }: {
  title: string; crumbs: Crumb[]; products: Product[]; searchParams: SP; aisleNames: Record<string, string>;
  q?: string; searchOrder?: Map<number, number>; intro?: ReactNode; empty?: ReactNode;
}) {
  const cap = capabilities(products);
  const sorts = cap.sorts;
  const params = parseParams(searchParams, sorts);
  const { total, shown, facets } = runListing(products, params, aisleNames, { searchOrder });
  const showStock = cap.stock, showPrice = cap.priced;
  const anyFilter = FACET_IDS.some((f) => params[f].length) || params.inStock || params.min != null || params.max != null;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={crumbs} />
      <div className="mt-3 flex flex-col gap-1">
        <h1 className="text-4xl text-primary sm:text-5xl">{title}</h1>
        {intro}
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-44 max-h-[calc(100dvh-12rem)] overflow-y-auto pr-2">
            <ListingFilters variant="rail" facets={facets} params={params} q={q} total={total} showStock={showStock} showPrice={showPrice} />
          </div>
        </aside>
        <div className="min-w-0">
          <h2 className="sr-only">Products</h2>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted" aria-live="polite">{total.toLocaleString()} {total === 1 ? "product" : "products"}</p>
            <div className="flex items-center gap-2">
              <div className="lg:hidden"><ListingFilters variant="drawer" facets={facets} params={params} q={q} total={total} showStock={showStock} showPrice={showPrice} /></div>
              <ListingSort params={params} q={q} sorts={sorts} />
            </div>
          </div>
          {total === 0 ? (empty ?? <EmptyState title="No products match these filters">{anyFilter ? "Try removing a filter." : "Nothing here yet."}</EmptyState>) : (
            <>
              <ProductGrid products={shown} />
              <ListingLoadMore params={params} q={q} shown={shown.length} total={total} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
