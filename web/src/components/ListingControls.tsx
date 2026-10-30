"use client";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { FilterDrawer, FilterPanel, type FilterState } from "./FilterPanel";
import { LoadMore } from "./LoadMore";
import { SortMenu, SORT_OPTIONS, type SortValue } from "./SortMenu";

type Facet = { id: string; label: string; options: { value: string; label: string; count: number }[] };
type Params = { aisle: string[]; pack: string[]; volume: string[]; sort: string; page: number; inStock: boolean };

function href(path: string, q: string | undefined, p: Params) {
  const u = new URLSearchParams();
  if (q) u.set("q", q);
  for (const k of ["aisle", "pack", "volume"] as const) if (p[k].length) u.set(k, p[k].join(","));
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

const toState = (p: Params): FilterState => ({ facets: { aisle: p.aisle, pack: p.pack, volume: p.volume }, inStock: p.inStock || undefined });
const fromState = (s: FilterState): Partial<Params> => ({ aisle: s.facets?.aisle ?? [], pack: s.facets?.pack ?? [], volume: s.facets?.volume ?? [], inStock: !!s.inStock });

export function ListingFilters({ facets, params, q, total, showStock, variant }: { facets: Facet[]; params: Params; q?: string; total: number; showStock: boolean; variant: "rail" | "drawer" }) {
  const { go, pending, params: shown } = useListingNav(params, q);
  const props = { facets, value: toState(shown), onChange: (s: FilterState) => go(fromState(s)), showPrice: false, showStock };
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
