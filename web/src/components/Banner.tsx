"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/** Thin announcement bar across the top of the page. */
export function AnnouncementBar({ children, tone = "brand", dismissible = true, onDismiss }: { children: ReactNode; tone?: "brand" | "info" | "warning"; dismissible?: boolean; onDismiss?: () => void }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const cls = { brand: "bg-brand-800 text-neutral-0", info: "bg-info-50 text-info-700", warning: "bg-warning-50 text-warning-700" }[tone];
  return (
    <div role="region" aria-label="Announcement" className={cn("relative px-12 py-2 text-center text-sm font-medium", cls)}>
      {children}
      {dismissible && (
        <button type="button" aria-label="Dismiss announcement" onClick={() => { setOpen(false); onDismiss?.(); }}
          className="tap-target absolute top-1/2 right-1 inline-grid -translate-y-1/2 place-items-center rounded-md hover:bg-black/10">
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}

/** Wide promotional banner. The image is optional; text always meets contrast on the solid panel. */
export function HeroBanner({ eyebrow, title, body, cta, image, as: Heading = "h2" }: {
  eyebrow?: string; title: string; body?: string; cta?: { label: string; href: string }; image?: ReactNode; as?: "h1" | "h2";
}) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-brand-700 text-neutral-0">
      <div className="grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-3">
          {eyebrow && <p className="text-sm font-semibold tracking-wide text-brand-100 uppercase">{eyebrow}</p>}
          <Heading className="text-4xl sm:text-5xl">{title}</Heading>
          {body && <p className="max-w-prose text-lg text-brand-100">{body}</p>}
          {cta && (
            <Link href={cta.href} className="mt-2 inline-flex h-12 w-fit items-center rounded-md bg-accent-600 px-6 font-semibold text-neutral-0 transition-colors duration-(--duration-fast) hover:bg-accent-700">
              {cta.label}
            </Link>
          )}
        </div>
        {image && <div className="relative min-h-48">{image}</div>}
      </div>
      <div aria-hidden="true" className="h-1.5 bg-accent-600" />
    </section>
  );
}
