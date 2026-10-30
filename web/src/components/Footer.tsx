import Link from "next/link";
import type { DayHours } from "@/config/store";
import { DAY_NAMES } from "@/lib/hours";
import { formatTime } from "@/lib/format";

type FooterProps = {
  name: string;
  address: { street: string; city: string; region: string; postalCode: string };
  phone: { display: string; e164: string };
  email?: string | null;
  week: DayHours[];
  directionsHref: string;
};

const LINKS = [
  { title: "Shop", items: [["Deals", "/deals"], ["New arrivals", "/new"], ["Search", "/search"]] },
  { title: "Store", items: [["Hours & directions", "/store"], ["Contact us", "/contact"]] },
  { title: "Policies", items: [["Privacy policy", "/privacy"], ["Terms of use", "/terms"], ["Accessibility", "/accessibility"], ["Drink responsibly", "/responsible-drinking"]] },
] as const;

/** Collapses identical consecutive days ("Every day", "Mon – Fri") so the hours read at a glance. */
function hoursSummary(week: DayHours[]) {
  const key = (h: DayHours) => (h ? `${h.open}-${h.close}` : "closed");
  if (week.every((h) => key(h) === key(week[0] ?? null))) {
    const h = week[0];
    return [h ? `Every day, ${formatTime(h.open)} – ${formatTime(h.close)}` : "Closed"];
  }
  return week.map((h, i) => `${DAY_NAMES[i]}: ${h ? `${formatTime(h.open)} – ${formatTime(h.close)}` : "Closed"}`);
}

export function Footer({ name, address, phone, email, week, directionsHref }: FooterProps) {
  return (
    <footer className="mt-16 bg-brand-900 text-brand-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-2">
          <p className="font-display text-2xl text-neutral-0 uppercase">{name}</p>
          <address className="not-italic">
            {address.street}<br />{address.city}, {address.region} {address.postalCode}
          </address>
          <a href={directionsHref} target="_blank" rel="noopener" className="w-fit font-semibold text-neutral-0 underline-offset-2 hover:underline">Get directions</a>
          <a href={`tel:${phone.e164}`} className="w-fit font-semibold text-neutral-0 underline-offset-2 hover:underline">{phone.display}</a>
          {email && <a href={`mailto:${email}`} className="w-fit text-neutral-0 underline-offset-2 hover:underline">{email}</a>}
          <ul className="mt-2 text-sm">{hoursSummary(week).map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
        {LINKS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-sans text-sm font-semibold tracking-wide text-neutral-0 uppercase">{col.title}</h2>
            <ul className="mt-2">
              {col.items.map(([label, href]) => (
                <li key={href}><Link href={href} className="flex min-h-11 items-center underline-offset-2 hover:text-neutral-0 hover:underline">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-brand-700">
        <p className="mx-auto max-w-7xl px-4 py-4 text-sm">
          You must be 21 or older to purchase alcohol. Please drink responsibly. Prices and availability can change; call to confirm before you visit.
        </p>
      </div>
    </footer>
  );
}
