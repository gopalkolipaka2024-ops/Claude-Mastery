import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ContactForm } from "./ContactForm";
import { store } from "@/config/store";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact us" }]} />
      <h1 className="mt-3 text-5xl text-primary">Contact us</h1>
      <p className="mt-2 text-lg">The fastest way to reach us is by phone: <a className="font-semibold text-primary underline" href={`tel:${store.phone.e164}`}>{store.phone.display}</a>.{store.email && <> Or email <a className="font-semibold text-primary underline" href={`mailto:${store.email}`}>{store.email}</a>.</>}</p>
      <div className="relative mt-8 rounded-lg border border-border bg-surface p-6"><ContactForm phone={store.phone} /></div>
    </div>
  );
}
