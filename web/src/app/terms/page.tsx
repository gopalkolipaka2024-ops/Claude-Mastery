import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";
import { store } from "@/config/store";
export const metadata: Metadata = pageMeta({ title: "Terms of use", path: "/terms", description: `Terms for using the ${store.name} website. Product information is for browsing; call the store to confirm.` });
export default function Page() {
  return (
    <LegalPage title="Terms of use">
      <p>By using this site you confirm that you are 21 or older.</p>
      <h2>Browsing only</h2>
      <p>This site shows products {store.name} carries. No orders, payments or reservations are taken here.</p>
      <h2>Prices and availability</h2>
      <p>Prices, stock and deals can change without notice and may differ from what is in the store. Please call <a href={`tel:${store.phone.e164}`}>{store.phone.display}</a> to confirm before you visit.</p>
      <h2>Images</h2>
      <p>Product images may be illustrations. Actual packaging can differ.</p>
      <h2>Alcohol</h2>
      <p>Alcohol is sold only in store to customers 21 or older with a valid photo ID, as required by Massachusetts law.</p>
    </LegalPage>
  );
}
