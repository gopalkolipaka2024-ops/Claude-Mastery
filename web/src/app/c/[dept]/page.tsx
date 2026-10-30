import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/ListingPage";
import { getCatalog } from "@/lib/catalog";
import { store } from "@/config/store";
import { isRefinedListing, pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ dept: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const d = (await getCatalog()).department((await params).dept);
  if (!d) return {};
  const aisles = d.children.slice(0, 3).map((a) => a.name.toLowerCase()).join(", ");
  return pageMeta({
    title: d.name, path: `/c/${d.slug}`, noindex: isRefinedListing(await searchParams),
    description: `Browse ${d.count.toLocaleString()} ${d.name.toLowerCase()} products, including ${aisles}, at ${store.name}, ${store.address.street.replace(/ #.*/, "")}, ${store.address.city}, ${store.address.region}.`,
  });
}

export default async function DepartmentPage({ params, searchParams }: Props) {
  const cat = await getCatalog();
  const d = cat.department((await params).dept);
  if (!d) notFound();
  return (
    <ListingPage title={d.name} path={`/c/${d.slug}`} crumbs={[{ label: "Home", href: "/" }, { label: d.name }]} products={cat.productsIn(d.slug)}
      searchParams={await searchParams} aisleNames={Object.fromEntries(d.children.map((a) => [a.slug, a.name]))} />
  );
}
