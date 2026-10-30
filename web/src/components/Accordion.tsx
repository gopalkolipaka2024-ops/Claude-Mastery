"use client";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export function AccordionItem({ title, children, defaultOpen = false, disabled, badge }: { title: string; children: ReactNode; defaultOpen?: boolean; disabled?: boolean; badge?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-b border-border">
      <h3 className="font-sans text-base font-semibold">
        <button type="button" aria-expanded={open} aria-controls={id} disabled={disabled} onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
          <span className="flex items-center gap-2">{title}{badge}</span>
          <Icon name="chevronDown" size={18} className={cn("shrink-0 transition-transform duration-(--duration-base)", open && "rotate-180")} />
        </button>
      </h3>
      <div id={id} role="region" aria-label={title} hidden={!open} className="pb-4">{children}</div>
    </div>
  );
}

export function Accordion({ children }: { children: ReactNode }) {
  return <div className="border-t border-border">{children}</div>;
}
