import type { Product } from "@/lib/catalog";
import { artUrl } from "@/lib/art-url";
import { ProductCard } from "./ProductCard";

/** Package drawings are cached SVG images (a few KB each, compressed). The first row loads
    eagerly; the rest load as they near the screen. Drawing them inline would repeat each one
    in the page's hydration data and slow the phone's start-up work. */
export function ProductGrid({ products, priorityCount = 4 }: { products: Product[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="flex w-full [&>article]:w-full">
            <ProductCard product={p} priority={i < priorityCount}
              art={<img src={artUrl(p.art)} alt="" width={120} height={160} loading={i < priorityCount ? "eager" : "lazy"} decoding="async"
                className="mx-auto h-full w-auto max-w-full object-contain" />} />
          </div>
        </li>
      ))}
    </ul>
  );
}
