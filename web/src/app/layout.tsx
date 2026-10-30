import type { Metadata, Viewport } from "next";
import { display, sans } from "./fonts";
import "@/styles/globals.css";
import "@/styles/package-art.css";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { AgeGate } from "@/components/AgeGate";
import { AnnouncementBar } from "@/components/Banner";
import { PackageArtDefs } from "@/components/PackageArtDefs";
import { ToastProvider } from "@/components/Toast";
import { categoryTree } from "@/lib/catalog";
import { announcements } from "@/lib/content";
import { directionsUrl, store } from "@/config/store";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: store.name, template: `%s | ${store.name}` },
  description: "Beer, wine, spirits, groceries and deli in Quincy, MA. Check what we carry, then visit or call.",
  robots: { index: false, follow: false }, // flipped on at launch (Phase 9)
};
export const viewport: Viewport = { themeColor: "#14295a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nav = [...categoryTree(), { name: "Deals", href: "/deals" }];
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <PackageArtDefs />
        <ToastProvider>
          {announcements().map((a) => <AnnouncementBar key={a.id} tone={a.tone}>{a.text}</AnnouncementBar>)}
          <SiteHeader categories={nav} phone={store.phone} hours={{ week: [...store.hours], timeZone: store.timeZone, holidays: [...store.holidayHours] }} />
          <main id="main" className="flex-1">{children}</main>
          <Footer name={store.name} address={store.address} phone={store.phone} email={store.email} week={[...store.hours]} directionsHref={directionsUrl()} />
          <AgeGate storeName={store.name} />
        </ToastProvider>
      </body>
    </html>
  );
}
