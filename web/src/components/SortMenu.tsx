"use client";
import { useId } from "react";
import { Icon } from "./Icon";

export const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "newest", label: "Newest" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/** A styled native select: the most reliable sort control on every device and screen reader. */
export function SortMenu({ value, onChange, disabled, options = SORT_OPTIONS }: {
  value: SortValue; onChange: (v: SortValue) => void; disabled?: boolean; options?: readonly { value: SortValue; label: string }[];
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text-muted">Sort by</label>
      <div className="relative">
        <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as SortValue)}
          className="h-11 appearance-none rounded-md border border-border-input bg-surface pr-9 pl-3 font-semibold hover:border-primary disabled:cursor-not-allowed disabled:opacity-50">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="chevronDown" size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
      </div>
    </div>
  );
}
