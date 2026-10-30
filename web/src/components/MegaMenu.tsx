"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CategoryNode } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/**
 * Category navigation, up to three levels. Top-level items are disclosure buttons (the
 * pattern WAI recommends for site navigation): Enter/Space or hover opens the panel,
 * Escape closes it and returns focus, and links inside are ordinary tab stops right after
 * their button.
 */
export function MegaMenu({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const hover = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open !== null) { btns.current[open]?.focus(); setOpen(null); }
    };
    const off = (e: PointerEvent) => { if (!nav.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", off);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", off); };
  }, [open]);

  const enter = (i: number) => { clearTimeout(hover.current); hover.current = setTimeout(() => setOpen(i), 120); };
  const leave = () => { clearTimeout(hover.current); hover.current = setTimeout(() => setOpen(null), 200); };

  return (
    <nav ref={nav} aria-label="Shop by category" className="relative" onMouseLeave={leave}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(null); }}>
      <ul className="flex items-stretch gap-1">
        {categories.map((c, i) => (
          <li key={c.href} onMouseEnter={() => (c.children?.length ? enter(i) : leave())}>
            {c.children?.length ? (<>
              <button ref={(el) => { btns.current[i] = el; }} type="button" aria-expanded={open === i} aria-controls={`mega-${i}`}
                onClick={() => setOpen(open === i ? null : i)}
                className={cn("flex h-11 items-center gap-1 border-b-3 px-3 font-semibold whitespace-nowrap transition-colors duration-(--duration-fast)",
                  open === i ? "border-accent-600 text-primary" : "border-transparent hover:border-border-strong")}>
                {c.name}<Icon name="chevronDown" size={14} className={cn("transition-transform duration-(--duration-base)", open === i && "rotate-180")} />
              </button>
              {/* The panel follows its button in the DOM, so Tab goes from the button into its links. */}
              <div id={`mega-${i}`} hidden={open !== i} onMouseEnter={() => clearTimeout(hover.current)}
                className="absolute inset-x-0 top-full z-(--z-dropdown) rounded-b-lg border border-t-0 border-border bg-surface p-6 shadow-lg animate-fade-in">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-6 gap-y-5">
                  {c.children.map((sub) => (
                    <div key={sub.href}>
                      <Link href={sub.href} className="inline-flex min-h-11 items-center font-display text-xl text-primary hover:underline">{sub.name}</Link>
                      {sub.children?.length ? (
                        <ul className="mt-1">
                          {sub.children.map((leaf) => (
                            <li key={leaf.href}><Link href={leaf.href} className="flex min-h-11 items-center text-text-muted hover:text-primary hover:underline">{leaf.name}</Link></li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
                <Link href={c.href} className="mt-5 inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:underline">Shop all {c.name}<Icon name="chevronRight" size={16} /></Link>
              </div>
            </>) : (
              <Link href={c.href} className="flex h-11 items-center border-b-3 border-transparent px-3 font-semibold whitespace-nowrap hover:border-border-strong">{c.name}</Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
