/* Stock badge thresholds. The site never shows exact counts; it maps the
   quantity on hand to one of three badges. Change the numbers here only.
   TODO(owner): confirm what counts as "low stock". */
export const STOCK_THRESHOLDS = {
  /** at or below this many units (and above zero) shows "Low stock" */
  low: 5,
} as const;

export type StockLevel = "in" | "low" | "out";

export function stockLevel(quantity: number | null | undefined): StockLevel | null {
  if (quantity == null || Number.isNaN(quantity)) return null; // unknown: show no badge
  if (quantity <= 0) return "out";
  if (quantity <= STOCK_THRESHOLDS.low) return "low";
  return "in";
}
