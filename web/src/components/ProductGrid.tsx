import type { Product } from "@/lib/catalog";
import { artUrl } from "@/lib/art-url";
import { PackageArt } from "./PackageArt";
import { ProductCard } from "./ProductCard";

/** The first row draws its packages inline so they paint with the HTML (no image round trip on a
    slow phone connection); the rest are cached, lazily loaded SVG images. */
export function ProductGrid({ products, priorityCount = 4 }: { products: Product[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="flex w-full [&>article]:w-full">
            <ProductCard product={p} priority={i < priorityCount}
              art={i < priorityCount ? <PackageArt art={p.art} /> : <img src={artUrl(p.art)} alt="" width={120} height={160} loading="lazy" decoding="async"
                className="mx-auto h-full w-auto max-w-full object-contain" />} />
          </div>
        </li>
      ))}
    </ul>
  );
}
