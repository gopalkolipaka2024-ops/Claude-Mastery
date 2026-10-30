import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <h1 className="mt-3 text-5xl text-primary">{title}</h1>
      <p className="mt-3 rounded-md bg-warning-50 p-3 text-sm text-warning-700">Draft for the store owner to review before launch. This is not legal advice.</p>
      <div className="mt-6 flex max-w-prose flex-col gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:text-primary [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6">{children}</div>
    </div>
  );
}
