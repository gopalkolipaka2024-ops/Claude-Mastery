"use client";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { Icon } from "./Icon";

/** Sort control: a native select that navigates to the sorted URL. */
export function SortSelect({ value, options, hrefs }: { value: string; options: { value: string; label: string }[]; hrefs: Record<string, string> }) {
  const id = useId();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text-muted">Sort by</label>
      <div className="relative">
        <select id={id} defaultValue={value} aria-busy={pending || undefined} onChange={(e) => start(() => router.push(hrefs[e.target.value]!, { scroll: false }))}
          className="h-11 appearance-none rounded-md border border-border-input bg-surface pr-9 pl-3 font-semibold hover:border-primary">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="chevronDown" size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
      </div>
    </div>
  );
}
