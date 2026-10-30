import type { Metadata, Viewport } from "next";
import { display, sans } from "./fonts";
import "@/styles/globals.css";
import "@/styles/package-art.css";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { AgeGate } from "@/components/AgeGateLoader";
import { AnnouncementBar } from "@/components/Banner";
import { PackageArtDefs } from "@/components/PackageArtDefs";
import { getCatalog } from "@/lib/catalog";
import { announcements, hours } from "@/lib/content";
import { directionsUrl, store } from "@/config/store";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: store.name, template: `%s | ${store.name}` },
  description: "Beer, wine, spirits, groceries and deli in Quincy, MA. Check what we carry, then visit or call.",
  applicationName: store.name,
  openGraph: { siteName: store.name, locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false }, // phone numbers are already real tel: links
  // Search engines are kept out until launch; set SITE_INDEXABLE=1 on the production deployment.
  robots: process.env.SITE_INDEXABLE === "1" ? { index: true, follow: true } : { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#14295a", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cat, ann, h] = await Promise.all([getCatalog(), announcements(), hours()]);
  const nav = [...cat.categoryTree(), { name: "Deals", href: "/deals" }];
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <PackageArtDefs />
        {ann.map((a) => <AnnouncementBar key={a.id} tone={a.tone}>{a.text}</AnnouncementBar>)}
        <SiteHeader categories={nav} phone={store.phone} hours={h} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
        <Footer name={store.name} address={store.address} phone={store.phone} email={store.email} week={h.week} directionsHref={directionsUrl()} />
        <AgeGate storeName={store.name} />
      </body>
    </html>
  );
}
