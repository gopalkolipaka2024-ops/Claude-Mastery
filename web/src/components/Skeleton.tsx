import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block rounded-md skeleton-shimmer", className)} />;
}

/** Same footprint as ProductCard so swapping in real cards causes no layout shift. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface" aria-hidden="true">
      <Skeleton className="aspect-[4/5] rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-7 w-1/3" />
      </div>
    </div>
  );
}
