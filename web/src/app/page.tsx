import Link from "next/link";
import { HeroBanner } from "@/components/Banner";
import { artUrl } from "@/lib/art-url";
import { PackageArt } from "@/components/PackageArt";
import { ProductGrid } from "@/components/ProductGrid";
import { StoreHours } from "@/components/StoreHours";
import { MapEmbed } from "@/components/MapEmbed";
import { Icon } from "@/components/Icon";
import { getCatalog } from "@/lib/catalog";
import { activeDeals, featuredSlugs, hours } from "@/lib/content";
import { directionsUrl, store } from "@/config/store";

export default async function Home() {
  const [cat, deals, featuredList, h] = await Promise.all([getCatalog(), activeDeals(), featuredSlugs(), hours()]);
  const depts = cat.departments();
  const productsIn = cat.productsIn;
  const featured = featuredList.map(cat.product).filter((p) => !!p);
  const gameDay = cat.all().filter((p) => p.gameDay).slice(0, 8);
  const dealProducts = deals.flatMap((d) => d.productSlugs).map(cat.product).filter((p) => !!p).slice(0, 8);
  const addr = `${store.address.street}, ${store.address.city}, ${store.address.region} ${store.address.postalCode}`;
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 py-6">
      <HeroBanner as="h1" eyebrow={`${store.address.street.replace(/ #.*/, "")}, ${store.address.city}`} title="Cold beer. Fresh deli. One stop."
        body={`Beer, wine, spirits, deli and groceries under one roof for ${store.neighborhoods.slice(0, -1).join(", ")} and ${store.neighborhoods.at(-1)}. See what we carry, then stop in or call.`}
        cta={{ label: "Shop beer & seltzers", href: "/c/beer" }}
        image={<div className="absolute inset-0 grid grid-cols-3 items-end gap-2">{productsIn("beer").slice(0, 3).map((p) => <div key={p.id} className="h-48"><PackageArt art={p.art} /></div>)}</div>} />

      {deals.length > 0 && (
        <section aria-labelledby="deals-h">
          <div className="flex items-end justify-between"><h2 id="deals-h" className="text-4xl text-primary">This week&apos;s deals</h2><Link href="/deals" className="font-semibold text-primary hover:underline">All deals</Link></div>
          {dealProducts.length > 0 && <div className="mt-4"><ProductGrid products={dealProducts} /></div>}
        </section>
      )}

      <section aria-labelledby="cats-h">
        <h2 id="cats-h" className="text-4xl text-primary">Shop by department</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {depts.map((d) => {
            const trio = productsIn(d.slug).filter((p) => !/pantry|household|pet/.test(p.aisle)).slice(0, 3);
            return (
              <li key={d.slug}>
                <Link href={`/c/${d.slug}`} className="group flex h-full flex-col rounded-lg border border-border bg-surface p-4 shadow-sm transition-[box-shadow,transform] duration-(--duration-base) hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative h-28" aria-hidden="true">
                    {trio.map((p, i) => <div key={p.id} className="absolute bottom-0 h-full w-[46%]" style={{ left: `${i * 27}%`, zIndex: i === 1 ? 2 : 1 }}><img src={artUrl(p.art)} alt="" width={120} height={160} loading="lazy" decoding="async" className="h-full w-full object-contain" /></div>)}
                  </div>
                  <span className="mt-3 font-display text-2xl text-primary">{d.name}</span>
                  <span className="text-sm text-text-muted">{d.count.toLocaleString()} products · {d.children.length} aisles</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="feat-h"><h2 id="feat-h" className="text-4xl text-primary">Featured</h2><div className="mt-4"><ProductGrid products={featured} /></div></section>
      )}

      {gameDay.length > 0 && (
        <section aria-labelledby="gd-h">
          <div className="flex items-end justify-between gap-4">
            <div><h2 id="gd-h" className="text-4xl text-primary">Stocked for game day</h2><p className="text-text-muted">Cold beer, seltzers, chips and ice our customers grab before kickoff.</p></div>
            <Link href="/search?q=game%20day" className="hidden font-semibold text-primary hover:underline sm:inline">See all game day picks</Link>
          </div>
          <div className="mt-4"><ProductGrid products={gameDay} /></div>
        </section>
      )}

      <section aria-labelledby="visit-h" className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 id="visit-h" className="text-4xl text-primary">Visit the store</h2>
          <address className="text-lg not-italic">{addr}</address>
          <div className="flex flex-wrap gap-3">
            <a href={`tel:${store.phone.e164}`} className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover"><Icon name="phone" size={18} />Call {store.phone.display}</a>
            <a href={directionsUrl()} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-md border border-border-input bg-surface px-4 font-semibold text-primary hover:border-primary"><Icon name="pin" size={18} />Directions</a>
          </div>
          <StoreHours week={h.week} timeZone={h.timeZone} holidays={h.holidays} />
        </div>
        <MapEmbed query={`${store.name}, ${addr}`} title={`Map to ${store.name}`} directionsHref={directionsUrl()} address={addr} />
      </section>
    </div>
  );
}
