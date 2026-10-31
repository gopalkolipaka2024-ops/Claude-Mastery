import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { store } from "@/config/store";
import { LegalPage } from "@/components/LegalPage";
export const metadata: Metadata = pageMeta({ title: "Drink responsibly", path: "/responsible-drinking", description: `You must be 21 or older to buy alcohol. Tips and resources for drinking responsibly from ${store.name}.` });
export default function Page() {
  return (
    <LegalPage title="Drink responsibly">
      <p>You must be 21 or older to buy alcohol. Bring a valid photo ID, such as a driver&apos;s license, Massachusetts Liquor ID or passport.</p>
      <ul>
        <li>Never drink and drive. Plan a ride before you go out.</li>
        <li>Don&apos;t buy alcohol for anyone under 21.</li>
        <li>If you are pregnant or may become pregnant, don&apos;t drink alcohol.</li>
      </ul>
      <h2>Get help</h2>
      <p>The SAMHSA National Helpline is free, confidential and open 24/7: <a href="tel:+18006624357">1-800-662-4357</a>. Learn more at <a href="https://www.responsibility.org/">responsibility.org</a> and <a href="https://www.niaaa.nih.gov/">niaaa.nih.gov</a>.</p>
    </LegalPage>
  );
}
