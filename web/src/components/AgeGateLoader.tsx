"use client";
import { lazy, Suspense, useEffect, useState } from "react";

const AgeGateDialog = lazy(() => import("./AgeGate"));

/**
 * 21+ confirmation on first visit. Visitors who already confirmed download none of the gate's code;
 * everyone else loads it right after the page appears. Page content stays in the HTML for search engines.
 */
export function AgeGate({ storeName }: { storeName: string }) {
  const [ask, setAsk] = useState(false);
  useEffect(() => { setAsk(!document.cookie.split("; ").includes("asm_age_ok=1")); }, []);
  return ask ? <Suspense fallback={null}><AgeGateDialog storeName={storeName} /></Suspense> : null;
}
