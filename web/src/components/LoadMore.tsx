"use client";
import Link from "next/link";
import { Button } from "./Button";

/**
 * "Load more" for people, plus a real link to the next page (?page=N) so crawlers and
 * no-JS visitors can reach every product. The button enhances that link.
 */
export function LoadMore({ shown, total, nextHref, onLoadMore, loading, error, onRetry }: {
  shown: number; total: number; nextHref?: string; onLoadMore?: () => void; loading?: boolean; error?: string | null; onRetry?: () => void;
}) {
  const remaining = total - shown;
  const pct = total ? Math.round((shown / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <p className="text-sm text-text-muted" aria-live="polite">Showing {shown.toLocaleString()} of {total.toLocaleString()} products</p>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
        <div className="h-full bg-primary transition-[width] duration-(--duration-slow)" style={{ width: `${pct}%` }} />
      </div>
      {error ? (
        <div role="alert" className="flex flex-col items-center gap-2 text-danger-600">
          <p className="text-sm">{error}</p>
          <Button variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      ) : remaining > 0 ? (
        onLoadMore && nextHref ? (
          <a href={nextHref} rel="next" aria-busy={loading || undefined}
            onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); onLoadMore(); }}
            className="inline-flex h-12 items-center gap-2 rounded-md border border-border-input bg-surface px-6 text-lg font-semibold text-primary hover:border-primary hover:bg-brand-50">
            {loading ? "Loading…" : `Load ${Math.min(remaining, 36)} more`}
          </a>
        ) : onLoadMore ? (
          <Button variant="secondary" size="lg" onClick={onLoadMore} loading={loading}>
            {loading ? "Loading…" : `Load ${Math.min(remaining, 36)} more`}
          </Button>
        ) : nextHref ? (
          <Link href={nextHref} rel="next" className="inline-flex h-12 items-center rounded-md border border-border-input bg-surface px-6 font-semibold text-primary hover:border-primary">Next page</Link>
        ) : null
      ) : null}
    </div>
  );
}
