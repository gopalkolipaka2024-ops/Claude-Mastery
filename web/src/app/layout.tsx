import type { Metadata, Viewport } from "next";
import { display, sans } from "./fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Adams Shore Super Market & Liquors", template: "%s | Adams Shore Super Market & Liquors" },
  description: "Beer, wine, spirits, groceries and deli in Quincy, MA. Check prices and availability, then visit or call.",
  robots: { index: false, follow: false }, // flipped on at launch (Phase 9)
};

export const viewport: Viewport = { themeColor: "#14295a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
