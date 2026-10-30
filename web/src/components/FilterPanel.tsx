"use client";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Accordion, AccordionItem } from "./Accordion";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

export type FacetOption = { value: string; label: string; count: number };
export type Facet = { id: string; label: string; options: FacetOption[] };
export type FilterState = { facets?: Record<string, string[]>; inStock?: boolean; minPrice?: number; maxPrice?: number };

function FacetGroup({ facet, selected, onToggle, disabled }: { facet: Facet; selected: string[]; onToggle: (v: string) => void; disabled?: boolean }) {
  const [all, setAll] = useState(false);
  const shown = all ? facet.options : facet.options.slice(0, 8);
  return (
    <AccordionItem title={facet.label} defaultOpen disabled={disabled} badge={selected.length ? <span className="rounded-full bg-brand-50 px-2 text-xs text-primary">{selected.length}</span> : undefined}>
      <fieldset disabled={disabled}>
        <legend className="sr-only">{facet.label}</legend>
        <ul className="flex flex-col">
          {shown.map((o) => {
            const checked = selected.includes(o.value);
            const empty = o.count === 0 && !checked;
            return (
              <li key={o.value}>
                <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-neutral-50", empty && "cursor-not-allowed opacity-50")}>
                  <input type="checkbox" checked={checked} disabled={empty} onChange={() => onToggle(o.value)} className="size-5 accent-brand-700" />
                  <span className="flex-1">{o.label}</span>
                  <span className="text-sm tabular-nums text-text-muted">{o.count.toLocaleString()}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {facet.options.length > 8 && (
          <button type="button" onClick={() => setAll((a) => !a)} className="mt-1 min-h-11 text-sm font-semibold text-primary underline-offset-2 hover:underline">
            {all ? "Show fewer" : `Show all ${facet.options.length}`}
          </button>
        )}
      </fieldset>
    </AccordionItem>
  );
}

function PriceRange({ min, max, onChange, disabled }: { min?: number; max?: number; onChange: (min?: number, max?: number) => void; disabled?: boolean }) {
  const id = useId();
  const [lo, setLo] = useState(min?.toString() ?? "");
  const [hi, setHi] = useState(max?.toString() ?? "");
  const loN = lo === "" ? undefined : Number(lo), hiN = hi === "" ? undefined : Number(hi);
  const invalid = loN !== undefined && hiN !== undefined && loN > hiN;
  return (
    <AccordionItem title="Price" defaultOpen disabled={disabled}>
      <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (!invalid) onChange(loN, hiN); }}>
        <div className="flex items-end gap-2">
          {[["Min", lo, setLo, `${id}-min`], ["Max", hi, setHi, `${id}-max`]].map(([label, v, set, fid]) => (
            <label key={fid as string} htmlFor={fid as string} className="flex flex-1 flex-col gap-1 text-sm font-semibold text-text-muted">
              {label as string} ($)
              <input id={fid as string} inputMode="decimal" value={v as string} disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-err` : undefined}
                onChange={(e) => (set as (s: string) => void)(e.target.value.replace(/[^\d.]/g, ""))}
                className={cn("h-11 w-full rounded-md border bg-surface px-3 text-text", invalid ? "border-danger-600" : "border-border-input")} />
            </label>
          ))}
          <Button type="submit" variant="secondary" disabled={disabled || invalid}>Go</Button>
        </div>
        {invalid && <p id={`${id}-err`} className="text-sm text-danger-600">Min price must be lower than max price.</p>}
      </form>
    </AccordionItem>
  );
}

export function FilterPanel({ facets, value, onChange, disabled, showPrice = true, showTitle = true, showStock = true }: {
  facets: Facet[]; value: FilterState; onChange: (v: FilterState) => void; disabled?: boolean; showPrice?: boolean; showTitle?: boolean; showStock?: boolean;
}) {
  const active = facets.reduce((n, f) => n + (value.facets?.[f.id]?.length ?? 0), 0) + (value.inStock ? 1 : 0) + (value.minPrice != null || value.maxPrice != null ? 1 : 0);
  const toggle = (fid: string, v: string) => {
    const cur = value.facets?.[fid] ?? [];
    onChange({ ...value, facets: { ...value.facets, [fid]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } });
  };
  return (
    <div aria-label="Filters" role="region" aria-busy={disabled || undefined}>
      <div className={cn("flex min-h-11 items-center justify-between pb-2", !showTitle && active === 0 && "hidden")}>
        {showTitle ? <h2 className="text-2xl text-primary">Filter</h2> : <span />}
        {active > 0 && (
          <button type="button" disabled={disabled} onClick={() => onChange({})} className="disabled:opacity-50 min-h-11 text-sm font-semibold text-primary underline-offset-2 hover:underline">
            Clear all ({active})
          </button>
        )}
      </div>
      {showStock && <label className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-border py-2 font-semibold", disabled && "cursor-not-allowed")}>
        In stock only
        <input type="checkbox" role="switch" checked={!!value.inStock} disabled={disabled} onChange={(e) => onChange({ ...value, inStock: e.target.checked || undefined })} className="size-5 accent-brand-700" />
      </label>}
      <Accordion>
        {showPrice && <PriceRange min={value.minPrice} max={value.maxPrice} disabled={disabled} onChange={(minPrice, maxPrice) => onChange({ ...value, minPrice, maxPrice })} />}
        {facets.map((f) => <FacetGroup key={f.id} facet={f} selected={value.facets?.[f.id] ?? []} disabled={disabled} onToggle={(v) => toggle(f.id, v)} />)}
      </Accordion>
    </div>
  );
}

/** Mobile: a "Filter" button that opens the panel as a bottom sheet with "Show X results". */
export function FilterDrawer(props: Parameters<typeof FilterPanel>[0] & { resultCount: number; loading?: boolean }) {
  const [open, setOpen] = useState(false);
  const active = props.facets.reduce((n, f) => n + (props.value.facets?.[f.id]?.length ?? 0), 0) + (props.value.inStock ? 1 : 0);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon name="filter" size={18} />Filter{active > 0 && <span className="rounded-full bg-primary px-2 text-xs text-on-primary">{active}</span>}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Filter" placement="sheet"
        footer={<Button className="w-full" size="lg" loading={props.loading} onClick={() => setOpen(false)}>Show {props.resultCount.toLocaleString()} results</Button>}>
        <FilterPanel {...props} showTitle={false} />
      </Dialog>
    </>
  );
}
