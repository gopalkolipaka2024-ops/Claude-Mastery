"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

const COOKIE = "asm_age_ok";

/**
 * 21+ confirmation on first visit. The page content is always in the HTML (so search
 * engines can index it); the gate is a client-side overlay. "Yes" and "No" are equally
 * prominent and the answer is remembered for a year.
 */
export function AgeGate({ storeName }: { storeName: string }) {
  const [state, setState] = useState<"checking" | "ask" | "ok" | "under">("checking");
  useEffect(() => { setState(document.cookie.split("; ").includes(`${COOKIE}=1`) ? "ok" : "ask"); }, []);
  if (state === "checking" || state === "ok") return null;
  const yes = () => { document.cookie = `${COOKIE}=1; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax; Secure`; setState("ok"); };
  return (
    <Dialog open onClose={() => {}} hideClose closeOnBackdrop={false} title={state === "under" ? "Sorry" : "Are you 21 or older?"}>
      {state === "ask" ? (
        <div className="flex flex-col gap-4">
          <p>{storeName} sells beer, wine and spirits. You must be 21 or older to browse.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" onClick={yes}>Yes, I&apos;m 21+</Button>
            <Button size="lg" variant="secondary" onClick={() => setState("under")}>No</Button>
          </div>
          <p className="text-sm text-text-muted">By entering you agree to our <Link href="/terms" className="underline">terms</Link>. Please drink responsibly.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p>You must be 21 or older to visit this site.</p>
          <Link href="https://www.responsibility.org/" className="font-semibold text-primary underline">Learn about responsible drinking</Link>
          <Button variant="secondary" onClick={() => setState("ask")}>Go back</Button>
        </div>
      )}
    </Dialog>
  );
}
