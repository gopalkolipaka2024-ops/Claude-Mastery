import type { Price } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Sale price shows only while the sale is running; afterwards the regular price shows again. */
export function isOnSale(price: Price, now = new Date()) {
  return price.saleCents != null && price.regularCents != null && price.saleCents < price.regularCents &&
    (!price.saleEndsAt || new Date(price.saleEndsAt) >= now);
}

export function PriceBlock({ price, size = "md", now, className }: { price: Price; size?: "md" | "lg"; now?: Date; className?: string }) {
  const big = size === "lg" ? "text-4xl" : "text-2xl";
  if (price.regularCents == null) {
    return <p className={cn("text-sm font-semibold text-text-muted", className)}>Call for price</p>;
  }
  if (isOnSale(price, now)) {
    return (
      <div className={cn("flex flex-col", className)}>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="sr-only">Sale price</span>
          <span className={cn("font-display tabular-nums text-accent-600", big)}>{formatPrice(price.saleCents!)}</span>
          <span className="text-sm text-text-muted line-through tabular-nums">
            <span className="sr-only">Regular price </span>{formatPrice(price.regularCents)}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-2 text-xs">
          <span className="rounded-sm bg-accent-50 px-1.5 py-0.5 font-semibold text-accent-700">
            Save {formatPrice(price.regularCents - price.saleCents!)}
          </span>
          {price.saleEndsAt && <span className="text-text-muted">Ends {formatDate(price.saleEndsAt)}</span>}
        </p>
      </div>
    );
  }
  return (
    <p className={cn("font-display tabular-nums text-text", big, className)}>
      <span className="sr-only">Price </span>{formatPrice(price.regularCents)}
    </p>
  );
}
