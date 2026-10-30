import { stockLevel, type StockLevel } from "@/config/stock";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const LOOK: Record<StockLevel, { label: string; cls: string; icon: "check" | "alert" | "x" }> = {
  in: { label: "In stock", cls: "bg-success-50 text-success-700", icon: "check" },
  low: { label: "Low stock", cls: "bg-warning-50 text-warning-700", icon: "alert" },
  out: { label: "Out of stock", cls: "bg-danger-50 text-danger-700", icon: "x" },
};

/** Shows In stock / Low stock / Out of stock. Never the count. Renders nothing when stock is unknown. */
export function StockBadge({ quantity, level, className }: { quantity?: number | null; level?: StockLevel; className?: string }) {
  const l = level ?? stockLevel(quantity);
  if (!l) return null;
  const look = LOOK[l];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold", look.cls, className)}>
      <Icon name={look.icon} size={14} />
      {look.label}
    </span>
  );
}
