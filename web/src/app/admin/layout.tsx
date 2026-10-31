import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { hasDatabase } from "@/db/client";
import { adminConfigured, adminEmail } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const notice = (text: string) => <div className="mx-auto max-w-3xl px-4 py-10"><h1 className="text-4xl text-primary">Admin</h1><p className="mt-3">{text}</p></div>;

/* Cloudflare Access signs staff in before a request reaches the site; this checks its signed
   token and the staff email list again. Every admin page and action also checks for itself. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabase()) return notice("The admin area needs the database. Set DATABASE_URL and DATABASE_URL_WRITE (see the runbook).");
  if (!adminConfigured()) return notice("The admin area isn't set up on this site yet (see the runbook).");
  const email = await adminEmail(await headers(), (await cookies()).toString());
  if (!email) return notice("You need to sign in through Cloudflare Access with a staff email.");
  return children;
}
