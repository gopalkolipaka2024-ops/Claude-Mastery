"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; content: ReactNode; disabled?: boolean };

/** WAI-ARIA tabs: arrow keys move between tabs, Home/End jump, Tab moves into the panel. */
export function Tabs({ items, defaultTab }: { items: TabItem[]; defaultTab?: string }) {
  const base = useId();
  const [active, setActive] = useState(defaultTab ?? items.find((t) => !t.disabled)?.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.map((t, i) => (t.disabled ? -1 : i)).filter((i) => i >= 0);
  const onKey = (e: KeyboardEvent, i: number) => {
    const pos = enabled.indexOf(i);
    let target: number | undefined;
    if (e.key === "ArrowRight") target = enabled[(pos + 1) % enabled.length];
    else if (e.key === "ArrowLeft") target = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") target = enabled[0];
    else if (e.key === "End") target = enabled[enabled.length - 1];
    if (target === undefined) return;
    e.preventDefault();
    setActive(items[target]!.id);
    refs.current[target]?.focus();
  };
  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((t, i) => {
          const sel = t.id === active;
          return (
            <button key={t.id} ref={(el) => { refs.current[i] = el; }} role="tab" type="button" id={`${base}-tab-${t.id}`}
              aria-selected={sel} aria-controls={`${base}-panel-${t.id}`} tabIndex={sel ? 0 : -1} disabled={t.disabled}
              onClick={() => setActive(t.id)} onKeyDown={(e) => onKey(e, i)}
              className={cn("-mb-px h-11 border-b-2 px-4 font-semibold whitespace-nowrap transition-colors duration-(--duration-fast)",
                sel ? "border-primary text-primary" : "border-transparent text-text-muted hover:border-border-strong hover:text-text",
                "disabled:cursor-not-allowed disabled:opacity-50")}>
              {t.label}
            </button>
          );
        })}
      </div>
      {items.map((t) => (
        <div key={t.id} role="tabpanel" id={`${base}-panel-${t.id}`} aria-labelledby={`${base}-tab-${t.id}`} hidden={t.id !== active} tabIndex={0} className="py-4">
          {t.content}
        </div>
      ))}
    </div>
  );
}
