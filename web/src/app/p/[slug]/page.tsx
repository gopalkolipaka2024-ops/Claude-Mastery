import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ImageGalleryLazy } from "@/components/ImageGalleryLazy";
import { PackageArt } from "@/components/PackageArt";
import { PriceBlock } from "@/components/PriceBlock";
import { StockBadge } from "@/components/StockBadge";
import { ProductGrid } from "@/components/ProductGrid";
import { StoreHours } from "@/components/StoreHours";
import { Icon } from "@/components/Icon";
import { getCatalog } from "@/lib/catalog";
import { hours } from "@/lib/content";
import { directionsUrl, store } from "@/config/store";
import { pageMeta, sizeBeyondName } from "@/lib/seo";
import { breadcrumbLd, productLd } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";

type Props = { params: Promise<{ slug: string }> };

/* Pre-render the 500 most important products; the rest render on first request and are cached. */
export async function generateStaticParams() {
  return (await getCatalog()).all().slice(0, 500).map((p) => ({ slug: p.slug }));
}
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = (await getCatalog()).product((await params).slug);
  if (!p) return {};
  return pageMeta({
    title: p.name, path: `/p/${p.slug}`,
    description: `${[p.name, sizeBeyondName(p)].filter(Boolean).join(", ")}, in ${p.category.toLowerCase()} at ${store.name} in ${store.address.city}, ${store.address.region}. Call ${store.phone.display} to confirm price and availability.`,
  });
}

export default async function ProductPage({ params }: Props) {
  const slug = (await params).slug;
  const [cat, h] = await Promise.all([getCatalog(), hours()]);
  const p = cat.product(slug);
  if (!p) {
    const moved = cat.redirect(slug);
    if (moved) permanentRedirect(`/p/${moved}`);
    notFound();
  }
  const d = cat.department(p.dept)!, a = cat.aisle(p.dept, p.aisle)!;
  const specs: [string, string | null][] = [
    ["Brand", p.brand], ["Department", d.name], ["Category", a.name], ["Pack", p.pack], ["Size", p.volume],
    ["Varietal / style", p.varietal], ["Country", p.country], ["Region", p.region],
    ["ABV", p.abv != null ? `${p.abv}%` : null], ["UPC", p.upc],
  ];
  const more = cat.related(p);
  const fromBrand = cat.sameBrand(p);
  const updated = p.updatedAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: store.timeZone }).format(new Date(p.updatedAt)) : null;
  const addr = `${store.address.street}, ${store.address.city}, ${store.address.region} ${store.address.postalCode}`;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <JsonLd data={productLd(p)} />
      <Breadcrumbs here={`/p/${p.slug}`} items={[{ label: "Home", href: "/" }, { label: d.name, href: `/c/${d.slug}` }, { label: a.name, href: `/c/${d.slug}/${a.slug}` }, { label: p.name }]} />
      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="group">
          {p.image ? <ImageGalleryLazy images={[p.image]} name={p.name} /> : (
            <figure className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface p-10">
              <PackageArt art={p.art} />
              <figcaption className="absolute right-3 bottom-3 rounded-md bg-surface/90 px-2 py-1 text-xs text-text-muted">Illustration. Packaging may differ.</figcaption>
            </figure>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold tracking-wide text-text-muted uppercase">{p.brand ?? a.name}</p>
            <h1 className="mt-1 text-4xl text-primary sm:text-5xl">{p.name}</h1>
            {p.size && <p className="mt-2 text-lg text-text-muted">{p.size}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3"><PriceBlock price={p.price} size="lg" /><StockBadge quantity={p.quantity} /></div>
          {updated && <p className="-mt-3 text-sm text-text-muted">Price and stock last updated {updated}</p>}
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="font-semibold">Prices and stock change often. Call to confirm before you visit.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={`tel:${store.phone.e164}`} className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-lg font-semibold text-on-primary hover:bg-primary-hover active:bg-primary-active"><Icon name="phone" size={20} />Call to confirm</a>
              <a href={directionsUrl()} target="_blank" rel="noopener" className="inline-flex h-12 items-center gap-2 rounded-md border border-border-input bg-surface px-5 font-semibold text-primary hover:border-primary"><Icon name="pin" size={20} />Directions</a>
            </div>
            <address className="mt-3 text-sm text-text-muted not-italic">{store.name}, {addr} · {store.phone.display}</address>
            <div className="mt-2"><StoreHours variant="compact" week={h.week} timeZone={h.timeZone} holidays={h.holidays} /></div>
          </div>
          <section aria-labelledby="specs-h">
            <h2 id="specs-h" className="text-2xl text-primary">Details</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {specs.filter(([, v]) => v).map(([k, v]) => (
                  <tr key={k} className="border-t border-border"><th scope="row" className="w-1/3 py-2 text-left font-semibold text-text-muted">{k}</th><td className="py-2">{v}</td></tr>
                ))}
              </tbody>
            </table>
            {p.description && <p className="mt-3 max-w-prose">{p.description}</p>}
            {p.note && <p className="mt-3">{p.note}</p>}
          </section>
          {["beer", "wine", "spirits"].includes(p.dept) && <p className="text-sm text-text-muted">21+ only. Bring a valid photo ID.</p>}
        </div>
      </div>
      {fromBrand.length > 0 && (
        <section aria-labelledby="brand-h" className="mt-14">
          <div className="flex items-end justify-between"><h2 id="brand-h" className="text-3xl text-primary">More from {p.brand}</h2><Link href={`/search?q=${encodeURIComponent(p.brand!)}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">All {p.brand} products</Link></div>
          <div className="mt-4"><ProductGrid products={fromBrand} priorityCount={0} /></div>
        </section>
      )}
      {more.length > 0 && (
        <section aria-labelledby="rel-h" className="mt-14">
          <div className="flex items-end justify-between"><h2 id="rel-h" className="text-3xl text-primary">More in {a.name}</h2><Link href={`/c/${d.slug}/${a.slug}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">All {a.name.toLowerCase()}</Link></div>
          <div className="mt-4"><ProductGrid products={more} priorityCount={0} /></div>
        </section>
      )}
    </div>
  );
}
