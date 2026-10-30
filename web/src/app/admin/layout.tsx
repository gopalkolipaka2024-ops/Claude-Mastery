import type { Metadata } from "next";
import { hasDatabase } from "@/db/client";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabase()) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><h1 className="text-4xl text-primary">Admin</h1><p className="mt-3">The admin area needs the database. Set DATABASE_URL and DATABASE_URL_WRITE (see the runbook).</p></div>;
  }
  return children;
}
