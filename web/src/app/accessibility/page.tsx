import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";
import { store } from "@/config/store";
export const metadata: Metadata = pageMeta({ title: "Accessibility", path: "/accessibility", description: `How the ${store.name} website supports people with disabilities, and how to report a problem.` });
export default function Page() {
  return (
    <LegalPage title="Accessibility">
      <p>We want everyone to be able to use this site. It is built to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.</p>
      <ul>
        <li>Every page works with a keyboard alone, with a visible focus outline and a &ldquo;Skip to content&rdquo; link.</li>
        <li>Text and controls meet AA color contrast, and buttons are at least 44 pixels tall for touch.</li>
        <li>Menus and dialogs work with screen readers and close with the Escape key.</li>
        <li>Pages can be zoomed to 400% without scrolling sideways.</li>
        <li>Animation stops when your device is set to reduce motion.</li>
      </ul>
      <p>This statement was last reviewed on October 30, 2026.</p>
      <p>If something doesn&apos;t work for you, call us at <a href={`tel:${store.phone.e164}`}>{store.phone.display}</a> and we&apos;ll help and fix it.</p>
    </LegalPage>
  );
}
