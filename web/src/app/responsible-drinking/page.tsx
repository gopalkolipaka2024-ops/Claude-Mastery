import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
export const metadata: Metadata = { title: "Drink responsibly" };
export default function Page() {
  return (
    <LegalPage title="Drink responsibly">
      <p>You must be 21 or older to buy alcohol. We check a valid photo ID for every alcohol purchase.</p>
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
