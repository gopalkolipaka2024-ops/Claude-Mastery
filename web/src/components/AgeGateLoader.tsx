"use client";
import { lazy, Suspense, useSyncExternalStore } from "react";

const AgeGateDialog = lazy(() => import("./AgeGate"));
const noSubscribe = () => () => {};

/**
 * 21+ confirmation on first visit. Visitors who already confirmed download none of the gate's code;
 * everyone else loads it right after the page appears. Page content stays in the HTML for search engines.
 */
export function AgeGate({ storeName }: { storeName: string }) {
  // Read the cookie in the browser only; the server always renders without the gate
  const ask = useSyncExternalStore(noSubscribe, () => !document.cookie.split("; ").includes("asm_age_ok=1"), () => false);
  return ask ? <Suspense fallback={null}><AgeGateDialog storeName={storeName} /></Suspense> : null;
}
