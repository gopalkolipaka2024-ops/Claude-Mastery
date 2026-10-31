"use client";
import { useEffect } from "react";
import { sendErrorBeacon } from "@/lib/error-beacon";

/* Last-resort error page (the root layout itself failed), so it can't use the site's components. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { sendErrorBeacon(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1rem", textAlign: "center", color: "#131a28" }}>
        <h1 style={{ color: "#14295a" }}>The site is having trouble</h1>
        <p>Please try again in a moment, or call (617) 472-6455.</p>
        <button onClick={reset} style={{ minHeight: 44, padding: "0 1.25rem", marginTop: 16, borderRadius: 8, border: "1px solid #657189", background: "#fff", fontWeight: 600 }}>Try again</button>
      </body>
    </html>
  );
}
