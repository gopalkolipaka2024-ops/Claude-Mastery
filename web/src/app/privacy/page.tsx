import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";
import { store } from "@/config/store";
export const metadata: Metadata = pageMeta({ title: "Privacy policy", path: "/privacy", description: `What information the ${store.name} website collects, why, and how to reach us about it.` });
export default function Page() {
  return (
    <LegalPage title="Privacy policy">
      <p>This site lets you browse what {store.name} carries. You can&apos;t buy anything or create an account here, so we collect very little.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Age confirmation:</strong> a small cookie remembers that you confirmed you are 21 or older, for up to a year.</li>
        <li><strong>Recent searches:</strong> kept only in your browser on this device. We never receive them.</li>
        <li><strong>Contact form:</strong> your name, email and message, used only to reply to you.</li>
        <li><strong>Visit statistics:</strong> counted without cookies or personal identifiers, to see which pages are used.</li>
      </ul>
      <h2>What we don&apos;t do</h2>
      <p>We don&apos;t sell your information, run advertising trackers, or share your messages with anyone except the services that deliver them to us.</p>
      <h2>Maps</h2>
      <p>The store map loads from Google Maps only when you choose &ldquo;Show map&rdquo;. Google&apos;s privacy policy applies to that map.</p>
      <h2>Questions</h2>
      <p>Call us at <a href={`tel:${store.phone.e164}`}>{store.phone.display}</a>.</p>
    </LegalPage>
  );
}
