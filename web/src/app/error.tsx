"use client";
import { ErrorState } from "@/components/ErrorState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <div className="mx-auto max-w-7xl px-4 py-10"><ErrorState title="This page didn't load" message="Something went wrong on our side. Try again, or go back to browsing." onRetry={reset} /></div>;
}
