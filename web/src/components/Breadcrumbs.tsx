import Link from "next/link";
import { breadcrumbLd } from "@/lib/structured-data";
import { Icon } from "./Icon";
import { JsonLd } from "./JsonLd";

export type Crumb = { label: string; href?: string };

/** With `here` (the current page's path) it also emits BreadcrumbList structured data. */
export function Breadcrumbs({ items, here }: { items: Crumb[]; here?: string }) {
  return (
    <>
      {here && <JsonLd data={breadcrumbLd(items, here)} />}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-text-muted">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                {last || !c.href ? (
                  <span aria-current={last ? "page" : undefined} className={last ? "font-semibold text-text" : undefined}>{c.label}</span>
                ) : (
                  <Link href={c.href} className="rounded-sm underline-offset-2 hover:text-primary hover:underline">{c.label}</Link>
                )}
                {!last && <Icon name="chevronRight" size={14} className="text-text-subtle" />}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
