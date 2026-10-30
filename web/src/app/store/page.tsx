import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MapEmbed } from "@/components/MapEmbed";
import { StoreHours } from "@/components/StoreHours";
import { Icon } from "@/components/Icon";
import { directionsUrl, store } from "@/config/store";
import { hours } from "@/lib/content";

export const metadata: Metadata = { title: "Hours & directions", description: `Hours, address, phone and directions for ${store.name} in Quincy, MA.` };

export default async function StorePage() {
  const h = await hours();
  const addr = `${store.address.street}, ${store.address.city}, ${store.address.region} ${store.address.postalCode}`;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hours & directions" }]} />
      <h1 className="mt-3 text-5xl text-primary">Visit the store</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <section aria-labelledby="addr-h">
            <h2 id="addr-h" className="text-2xl text-primary">Address</h2>
            <address className="mt-1 text-lg not-italic">{store.name}<br />{store.address.street}<br />{store.address.city}, {store.address.region} {store.address.postalCode}</address>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={directionsUrl()} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover"><Icon name="pin" size={18} />Get directions</a>
              <a href={`tel:${store.phone.e164}`} className="inline-flex h-11 items-center gap-2 rounded-md border border-border-input bg-surface px-4 font-semibold text-primary hover:border-primary"><Icon name="phone" size={18} />{store.phone.display}</a>
            </div>
          </section>
          <StoreHours week={h.week} timeZone={h.timeZone} holidays={h.holidays} />
          {store.parking && <section aria-labelledby="park-h"><h2 id="park-h" className="text-2xl text-primary">Parking</h2><p className="mt-1">{store.parking}</p></section>}
          <section aria-labelledby="hood-h">
            <h2 id="hood-h" className="text-2xl text-primary">Neighborhoods we serve</h2>
            <ul className="mt-2 flex flex-wrap gap-2">{store.neighborhoods.map((n) => <li key={n} className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-primary">{n}</li>)}</ul>
          </section>
        </div>
        <MapEmbed query={`${store.name}, ${addr}`} title={`Map to ${store.name}`} directionsHref={directionsUrl()} address={addr} />
      </div>
    </div>
  );
}
