"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { Spinner } from "./Spinner";

export type Suggestion = { label: string; href: string; meta?: string };
export type SuggestionGroups = { products: Suggestion[]; brands: Suggestion[]; categories: Suggestion[] };
type Status = "idle" | "loading" | "ready" | "error";

const RECENT_KEY = "asm:recent-searches";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; } };
const saveRecent = (q: string) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 6))); } catch { /* storage blocked */ } };

/**
 * WAI-ARIA combobox with grouped suggestions (products, brands, categories) and recent
 * searches kept on this device. `search` is the data source; typo tolerance and synonyms
 * live in the search index, not here.
 */
export function SearchBox({ search, onSubmit, placeholder = "Search wine, beer, spirits, snacks…", disabled }: {
  search: (q: string) => Promise<SuggestionGroups>; onSubmit: (q: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [groups, setGroups] = useState<SuggestionGroups>({ products: [], brands: [], categories: [] });
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const req = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => { setRecent(readRecent()); }, []);
  useEffect(() => {
    const term = q.trim();
    if (!term) { setStatus("idle"); return; }
    const n = ++req.current;
    setStatus("loading");
    const t = setTimeout(() => {
      search(term).then((g) => { if (n === req.current) { setGroups(g); setStatus("ready"); setActive(-1); } })
        .catch(() => { if (n === req.current) setStatus("error"); });
    }, 60);
    return () => clearTimeout(t);
  }, [q, search]);
  useEffect(() => {
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, []);

  const showRecent = !q.trim() && recent.length > 0;
  type Option = Suggestion & { group: string };
  const options = useMemo<Option[]>(() => showRecent
    ? recent.map((r) => ({ label: r, href: "", group: "Recent searches" }))
    : [...groups.categories.map((s) => ({ ...s, group: "Categories" })), ...groups.brands.map((s) => ({ ...s, group: "Brands" })), ...groups.products.map((s) => ({ ...s, group: "Products" }))],
  [showRecent, recent, groups]);

  const submit = useCallback((term: string) => {
    const t = term.trim(); if (!t) return;
    saveRecent(t); setRecent(readRecent()); setOpen(false); onSubmit(t);
  }, [onSubmit]);
  const choose = (o: (typeof options)[number]) => {
    if (!o.href) { setQ(o.label); submit(o.label); return; }
    saveRecent(q.trim() || o.label); setOpen(false); window.location.assign(o.href);
  };
  const expanded = open && (showRecent || status !== "idle");

  return (
    <div ref={root} className="relative w-full" role="search">
      <form onSubmit={(e) => { e.preventDefault(); if (active >= 0 && options[active]) choose(options[active]); else submit(q); }}>
        <label htmlFor={id} className="sr-only">Search products</label>
        <div className={cn("flex h-12 items-center gap-1 rounded-full border bg-surface pr-0.5 pl-4 transition-colors duration-(--duration-fast)",
          "border-border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-brand-200", disabled && "opacity-50")}>
          <Icon name="search" size={18} className="shrink-0 text-text-muted" />
          <input id={id} type="search" value={q} disabled={disabled} placeholder={placeholder} autoComplete="off" spellCheck={false}
            role="combobox" aria-expanded={expanded} aria-controls={expanded ? `${id}-list` : undefined} aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(options.length - 1, a + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
              else if (e.key === "Escape") { if (open) { e.preventDefault(); setOpen(false); setActive(-1); } else setQ(""); }
            }}
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-subtle [&::-webkit-search-cancel-button]:hidden" />
          {status === "loading" && <span className="text-text-muted"><Spinner size={16} /></span>}
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => { setQ(""); setActive(-1); }} className="inline-grid size-11 place-items-center rounded-full text-text-muted hover:bg-neutral-50">
              <Icon name="x" size={16} />
            </button>
          )}
          <button type="submit" disabled={disabled} className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover active:bg-primary-active">Search</button>
        </div>
      </form>
      {expanded && (
        <div className="absolute inset-x-0 top-full z-(--z-dropdown) mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-lg animate-fade-in">
          {status === "error" && !showRecent ? (
            <p id={`${id}-list`} role="alert" className="p-3 text-sm text-danger-600">Search isn't responding right now. Press Enter to search anyway.</p>
          ) : status === "ready" && !options.length && !showRecent ? (
            <p id={`${id}-list`} className="p-3 text-sm text-text-muted">No matches for “{q.trim()}”. Try a brand, a style like “IPA”, or a size like “30 pk”.</p>
          ) : (
            <div id={`${id}-list`} role="listbox" aria-label="Search suggestions">
              {/* Options grouped under named headings (Products, Categories, Recent searches) */}
              {[...new Set(options.map((o) => o.group))].map((group, g) => (
                <div key={group} role="group" aria-labelledby={`${id}-grp-${g}`}>
                  <p id={`${id}-grp-${g}`} className="flex items-center gap-1 px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-text-subtle uppercase">
                    {group === "Recent searches" && <Icon name="history" size={12} />}{group}
                  </p>
                  {options.map((o, i) => o.group !== group ? null : (
                    <div key={`${o.label}-${i}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active} onPointerDown={(e) => e.preventDefault()} onClick={() => choose(o)}
                      className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3", i === active ? "bg-brand-50 text-primary" : "hover:bg-neutral-50")}>
                      <span>{o.label}</span>{o.meta && <span className="text-sm text-text-muted">{o.meta}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
