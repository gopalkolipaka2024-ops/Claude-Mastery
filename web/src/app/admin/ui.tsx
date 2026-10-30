import Link from "next/link";
import type { ReactNode } from "react";

export const input = "h-11 w-full rounded-md border border-border-input bg-surface px-3";
export const btn = "inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover";
export const btnQuiet = "inline-flex h-11 items-center rounded-md border border-border-input bg-surface px-3 font-semibold text-primary hover:border-primary";

const NAV = [["/admin", "Overview"], ["/admin/announcements", "Announcements"], ["/admin/deals", "Deals"], ["/admin/featured", "Featured"], ["/admin/hours", "Hours"]];

export function AdminShell({ title, email, sp, children }: { title: string; email: string; sp: Record<string, string | string[] | undefined>; children: ReactNode }) {
  const saved = typeof sp.saved === "string" ? sp.saved : null, error = typeof sp.error === "string" ? sp.error : null;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Store admin</p>
        <p className="text-sm text-text-muted">Signed in as {email}</p>
      </div>
      <nav aria-label="Admin" className="mt-2 flex flex-wrap gap-1 border-b border-border">
        {NAV.map(([href, label]) => <Link key={href} href={href!} className="flex h-11 items-center px-3 font-semibold text-primary hover:bg-brand-50">{label}</Link>)}
      </nav>
      <h1 className="mt-6 text-4xl text-primary">{title}</h1>
      <div aria-live="polite">
        {saved && <p className="mt-4 rounded-md bg-success-50 p-3 text-success-700">{saved}</p>}
        {error && <p role="alert" className="mt-4 rounded-md bg-danger-50 p-3 text-danger-700">{error}</p>}
      </div>
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="font-semibold">{label}</span>{children}{hint && <span className="text-sm text-text-muted">{hint}</span>}</label>;
}
