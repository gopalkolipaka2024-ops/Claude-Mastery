import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <EmptyState as="h1" title="We couldn't find that page"
        actions={<><Link href="/" className="inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover">Go to the home page</Link><Link href="/search" className="inline-flex h-11 items-center rounded-md border border-border-input bg-surface px-4 font-semibold text-primary hover:border-primary">Search products</Link></>}>
        The product may no longer be listed, or the link may be wrong.
      </EmptyState>
    </div>
  );
}
