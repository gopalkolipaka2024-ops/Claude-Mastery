import Link from "next/link";
import { cn } from "@/lib/cn";
import { FACET_IDS, type FacetOut, type ListingParams } from "@/lib/listing";
import { Icon } from "./Icon";

/* Filters as plain links and a GET form: no JavaScript, crawlable, and every state is a URL.
   Used for the desktop rail and inside the mobile filter sheet. */
export function listingHref(path: string, p: ListingParams, q: string | undefined, change: Partial<ListingParams>) {
  const n = { ...p, page: 1, ...change };
  const u = new URLSearchParams();
  if (q) u.set("q", q);
  for (const f of FACET_IDS) if (n[f].length) u.set(f, n[f].join(","));
  if (n.min != null) u.set("min", String(n.min));
  if (n.max != null) u.set("max", String(n.max));
  if (n.inStock) u.set("stock", "in");
  if (n.sort !== "relevance") u.set("sort", n.sort);
  if (n.page > 1) u.set("page", String(n.page));
  const s = u.toString();
  return s ? `${path}?${s}` : path;
}

const box = (on: boolean) => (
  <span aria-hidden="true" className={cn("grid size-5 shrink-0 place-items-center rounded-sm border-2", on ? "border-primary bg-primary text-on-primary" : "border-border-input bg-surface")}>
    {on && <Icon name="check" size={14} />}
  </span>
);

function Option({ href, on, label, count }: { href?: string; on: boolean; label: string; count?: number }) {
  const inner = <>{box(on)}<span className="flex-1">{label}</span>{count != null && <span className="text-sm tabular-nums text-text-muted">{count.toLocaleString()}</span>}</>;
  const cls = "flex min-h-11 items-center gap-3 rounded-md px-1";
  if (!href) return <span aria-disabled="true" className={cn(cls, "opacity-50")}>{inner}</span>;
  return (
    <Link href={href} scroll={false} prefetch={false} className={cn(cls, "hover:bg-neutral-50")}>
      {inner}<span className="sr-only">{on ? ", selected. Remove this filter" : ""}</span>
    </Link>
  );
}

export function FilterLinks({ facets, params, path, q, showStock, showPrice, showTitle = true }: {
  facets: FacetOut[]; params: ListingParams; path: string; q?: string; showStock: boolean; showPrice: boolean; showTitle?: boolean;
}) {
  const active = FACET_IDS.reduce((n, f) => n + params[f].length, 0) + (params.inStock ? 1 : 0) + (params.min != null || params.max != null ? 1 : 0);
  const toggle = (id: FacetOut["id"], v: string) => listingHref(path, params, q, { [id]: params[id].includes(v) ? params[id].filter((x) => x !== v) : [...params[id], v] });
  return (
    <div className="flex flex-col">
      {(showTitle || active > 0) && (
        <div className="flex min-h-11 items-center justify-between pb-2">
          {showTitle ? <h2 className="text-2xl text-primary">Filter</h2> : <span />}
          {active > 0 && <Link href={listingHref(path, { ...params, aisle: [], brand: [], pack: [], volume: [], country: [], varietal: [], inStock: false, min: null, max: null }, q, {})} scroll={false} prefetch={false} className="flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-2 hover:underline">Clear all ({active})</Link>}
        </div>
      )}
      {showStock && (
        <div className="border-t border-border py-1">
          <Option href={listingHref(path, params, q, { inStock: !params.inStock })} on={params.inStock} label="In stock only" />
        </div>
      )}
      {showPrice && (
        <section aria-labelledby="f-price" className="border-t border-border py-3">
          <h3 id="f-price" className="font-sans text-base font-semibold">Price</h3>
          <form method="get" action={path} className="mt-2 flex items-end gap-2">
            {q && <input type="hidden" name="q" value={q} />}
            {FACET_IDS.map((f) => params[f].length ? <input key={f} type="hidden" name={f} value={params[f].join(",")} /> : null)}
            {params.inStock && <input type="hidden" name="stock" value="in" />}
            {params.sort !== "relevance" && <input type="hidden" name="sort" value={params.sort} />}
            {(["min", "max"] as const).map((k) => (
              <label key={k} className="flex flex-1 flex-col gap-1 text-sm font-semibold text-text-muted">{k === "min" ? "Min" : "Max"} ($)
                <input name={k} type="number" min={0} step="0.01" inputMode="decimal" defaultValue={params[k] ?? undefined} className="h-11 w-full rounded-md border border-border-input bg-surface px-3 text-text" />
              </label>
            ))}
            <button className="inline-flex h-11 items-center rounded-md border border-border-input bg-surface px-4 font-semibold text-primary hover:border-primary">Go</button>
          </form>
        </section>
      )}
      {facets.map((f) => {
        const first = f.options.slice(0, 8), rest = f.options.slice(8);
        const opt = (o: FacetOut["options"][number]) => {
          const on = params[f.id].includes(o.value);
          return <li key={o.value}><Option href={o.count === 0 && !on ? undefined : toggle(f.id, o.value)} on={on} label={o.label} count={o.count} /></li>;
        };
        return (
          <section key={f.id} aria-labelledby={`f-${f.id}`} className="border-t border-border py-3">
            <h3 id={`f-${f.id}`} className="flex items-center gap-2 font-sans text-base font-semibold">
              {f.label}{params[f.id].length > 0 && <span className="rounded-full bg-brand-50 px-2 text-xs text-primary">{params[f.id].length}</span>}
            </h3>
            <ul className="mt-1">{first.map(opt)}</ul>
            {rest.length > 0 && (
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show all {f.options.length}</span><span className="hidden group-open:inline">Show fewer</span>
                </summary>
                <ul>{rest.map(opt)}</ul>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}
