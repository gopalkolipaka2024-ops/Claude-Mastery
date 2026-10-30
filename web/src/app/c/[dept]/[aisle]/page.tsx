import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/ListingPage";
import { getCatalog } from "@/lib/catalog";

type Props = { params: Promise<{ dept: string; aisle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dept, aisle } = await params;
  const cat = await getCatalog();
  const d = cat.department(dept), a = cat.aisle(dept, aisle);
  return d && a ? { title: `${a.name} | ${d.name}`, description: `${a.count.toLocaleString()} ${a.name.toLowerCase()} products in ${d.name.toLowerCase()}.` } : {};
}

export default async function AislePage({ params, searchParams }: Props) {
  const { dept, aisle } = await params;
  const cat = await getCatalog();
  const d = cat.department(dept), a = cat.aisle(dept, aisle);
  if (!d || !a) notFound();
  return (
    <ListingPage title={a.name} crumbs={[{ label: "Home", href: "/" }, { label: d.name, href: `/c/${d.slug}` }, { label: a.name }]}
      products={cat.productsIn(d.slug, a.slug)} searchParams={await searchParams} aisleNames={{ [a.slug]: a.name }} />
  );
}
