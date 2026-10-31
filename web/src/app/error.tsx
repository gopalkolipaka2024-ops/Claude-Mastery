"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";
import { sendErrorBeacon } from "@/lib/error-beacon";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { sendErrorBeacon(error); }, [error]);
  return <div className="mx-auto max-w-7xl px-4 py-10"><ErrorState title="This page didn't load" message="Something went wrong on our side. Try again, or go back to browsing." onRetry={reset} /></div>;
}
