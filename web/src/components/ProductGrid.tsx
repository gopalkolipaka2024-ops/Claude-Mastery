import type { Product } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";
import { PackageArt } from "./PackageArt";

export function ProductGrid({ products, priorityCount = 4 }: { products: Product[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="flex w-full [&>article]:w-full"><ProductCard product={p} priority={i < priorityCount} art={<PackageArt art={p.art} />} /></div>
        </li>
      ))}
    </ul>
  );
}
