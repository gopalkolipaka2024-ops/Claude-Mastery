import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/ListingPage";
import { getCatalog } from "@/lib/catalog";
import { isRefinedListing, pageMeta } from "@/lib/seo";
import { store } from "@/config/store";

type Props = { params: Promise<{ dept: string; aisle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { dept, aisle } = await params;
  const cat = await getCatalog();
  const d = cat.department(dept), a = cat.aisle(dept, aisle);
  if (!d || !a) return {};
  const top = cat.productsIn(d.slug, a.slug).slice(0, 2).map((p) => p.name).join(" and ");
  return pageMeta({
    title: `${a.name} | ${d.name}`, path: `/c/${d.slug}/${a.slug}`, noindex: isRefinedListing(await searchParams),
    description: `${a.count.toLocaleString()} ${a.name.toLowerCase()} products at ${store.name} in ${store.address.city}, ${store.address.region}${top ? `, including ${top}` : ""}.`,
  });
}

export default async function AislePage({ params, searchParams }: Props) {
  const { dept, aisle } = await params;
  const cat = await getCatalog();
  const d = cat.department(dept), a = cat.aisle(dept, aisle);
  if (!d || !a) notFound();
  return (
    <ListingPage title={a.name} path={`/c/${d.slug}/${a.slug}`} crumbs={[{ label: "Home", href: "/" }, { label: d.name, href: `/c/${d.slug}` }, { label: a.name }]}
      products={cat.productsIn(d.slug, a.slug)} searchParams={await searchParams} aisleNames={{ [a.slug]: a.name }} />
  );
}
