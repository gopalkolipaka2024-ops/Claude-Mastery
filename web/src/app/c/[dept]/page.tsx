import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/ListingPage";
import { department, productsIn } from "@/lib/catalog";

type Props = { params: Promise<{ dept: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = department((await params).dept);
  return d ? { title: d.name, description: `Browse ${d.count.toLocaleString()} ${d.name.toLowerCase()} products at ${"Adams Shore Super Market & Liquors"} in Quincy, MA.` } : {};
}

export default async function DepartmentPage({ params, searchParams }: Props) {
  const d = department((await params).dept);
  if (!d) notFound();
  return (
    <ListingPage title={d.name} crumbs={[{ label: "Home", href: "/" }, { label: d.name }]} products={productsIn(d.slug)}
      searchParams={await searchParams} aisleNames={Object.fromEntries(d.children.map((a) => [a.slug, a.name]))} />
  );
}
