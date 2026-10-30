import Image from "next/image";
import type { ReactNode } from "react";
import Link from "next/link";
import type { ProductSummary } from "@/lib/types";
import { cn } from "@/lib/cn";
import { PriceBlock } from "./PriceBlock";
import { StockBadge } from "./StockBadge";
import { Icon } from "./Icon";

/** The whole card is one link (one tab stop). Fixed image ratio keeps the grid from shifting. */
export function ProductCard({ product, priority = false, art }: { product: ProductSummary; priority?: boolean; art?: ReactNode }) {
  const out = product.quantity != null && product.quantity <= 0;
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm",
      "transition-[box-shadow,transform] duration-(--duration-base) ease-standard hover:-translate-y-0.5 hover:shadow-md",
      "focus-within:shadow-md")}>
      <div className="relative aspect-[4/5] bg-surface-sunken">
        {product.image ? (
          <Image src={product.image.src} alt={product.image.alt} fill sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
            priority={priority} className={cn("object-contain p-4", out && "opacity-60")} />
        ) : art ? (
          <div className="h-full p-4">{art}</div>
        ) : (
          <div className="grid h-full place-items-center text-neutral-300" aria-hidden="true"><Icon name="bottle" size={56} /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand && <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">{product.brand}</p>}
        <h3 className="font-sans text-base leading-snug font-semibold">
          <Link href={`/p/${product.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">
            {product.name}
          </Link>
        </h3>
        {product.size && <p className="text-sm text-text-muted">{product.size}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <PriceBlock price={product.price} />
          <StockBadge quantity={product.quantity} />
        </div>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg ring-3 ring-focus opacity-0 group-has-[:focus-visible]:opacity-100" />
    </article>
  );
}
