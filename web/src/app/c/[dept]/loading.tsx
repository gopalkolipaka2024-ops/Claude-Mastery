import { ProductCardSkeleton, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6" aria-busy="true" aria-label="Loading products">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-12 w-72" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="hidden flex-col gap-3 lg:flex">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8" />)}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
      </div>
    </div>
  );
}
