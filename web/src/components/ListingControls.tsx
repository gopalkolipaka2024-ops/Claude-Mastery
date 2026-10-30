"use client";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { FilterDrawer, FilterPanel, type FilterState } from "./FilterPanel";
import { LoadMore } from "./LoadMore";
import { SortMenu, SORT_OPTIONS, type SortValue } from "./SortMenu";

type Facet = { id: string; label: string; options: { value: string; label: string; count: number }[] };
const FACET_IDS = ["aisle", "brand", "pack", "volume", "country", "varietal"] as const;
type Params = Record<(typeof FACET_IDS)[number], string[]> & { sort: string; page: number; inStock: boolean; min: number | null; max: number | null };

function href(path: string, q: string | undefined, p: Params) {
  const u = new URLSearchParams();
  if (q) u.set("q", q);
  for (const k of FACET_IDS) if (p[k].length) u.set(k, p[k].join(","));
  if (p.min != null) u.set("min", String(p.min));
  if (p.max != null) u.set("max", String(p.max));
  if (p.inStock) u.set("stock", "in");
  if (p.sort !== "relevance") u.set("sort", p.sort);
  if (p.page > 1) u.set("page", String(p.page));
  const s = u.toString();
  return s ? `${path}?${s}` : path;
}

/** Filters, sort and load-more for a listing. Every change becomes a URL, so results are shareable and Back works. */
export function useListingNav(params: Params, q?: string) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  // Show the new selection right away while the server renders the results.
  const [shown, setShown] = useOptimistic(params, (cur, next: Partial<Params>) => ({ ...cur, ...next }));
  const go = (p: Partial<Params>, opts: { scroll?: boolean } = {}) =>
    start(() => { setShown(p); router.push(href(path, q, { ...params, page: 1, ...p }), { scroll: opts.scroll ?? false }); });
  return { go, pending, path, params: shown };
}

const toState = (p: Params): FilterState => ({
  facets: Object.fromEntries(FACET_IDS.map((k) => [k, p[k]])), inStock: p.inStock || undefined, minPrice: p.min ?? undefined, maxPrice: p.max ?? undefined,
});
const fromState = (s: FilterState): Partial<Params> => ({
  ...Object.fromEntries(FACET_IDS.map((k) => [k, s.facets?.[k] ?? []])), inStock: !!s.inStock, min: s.minPrice ?? null, max: s.maxPrice ?? null,
});

export function ListingFilters({ facets, params, q, total, showStock, showPrice, variant }: { facets: Facet[]; params: Params; q?: string; total: number; showStock: boolean; showPrice: boolean; variant: "rail" | "drawer" }) {
  const { go, pending, params: shown } = useListingNav(params, q);
  const props = { facets, value: toState(shown), onChange: (s: FilterState) => go(fromState(s)), showPrice, showStock };
  return variant === "rail" ? <div aria-busy={pending || undefined}><FilterPanel {...props} /></div> : <FilterDrawer {...props} resultCount={total} loading={pending} />;
}

export function ListingSort({ params, q, sorts }: { params: Params; q?: string; sorts: string[] }) {
  const { go, pending, params: shown } = useListingNav(params, q);
  return <SortMenu value={shown.sort as SortValue} disabled={pending} options={SORT_OPTIONS.filter((o) => sorts.includes(o.value))} onChange={(v) => go({ sort: v })} />;
}

export function ListingLoadMore({ params, q, shown, total }: { params: Params; q?: string; shown: number; total: number }) {
  const { go, pending, path } = useListingNav(params, q);
  return <LoadMore shown={shown} total={total} loading={pending} nextHref={href(path, q, { ...params, page: params.page + 1 })} onLoadMore={() => go({ page: params.page + 1 })} />;
}
