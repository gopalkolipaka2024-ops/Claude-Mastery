import Link from "next/link";

/** Original wordmark: a navy tile with a red tide line, and the store name in the display face. */
export function Logo({ name = "Adams Shore", tagline = "Super Market & Liquors" }: { name?: string; tagline?: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md">
      <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" rx="10" fill="var(--color-brand-700)" />
        <path d="M0 33 Q12 27 24 33 T48 33 V48 H0Z" fill="var(--color-accent-600)" />
        <path d="M0 37 Q12 31 24 37 T48 37" stroke="#fff" strokeWidth="2" fill="none" />
        <text x="24" y="26" textAnchor="middle" fill="#fff" style={{ font: "800 19px var(--font-display)" }}>AS</text>
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-2xl text-primary uppercase">{name}</span>{" "}
        <span className="text-[0.7rem] font-semibold tracking-[0.14em] text-accent-600 uppercase">{tagline}</span>
      </span>
    </Link>
  );
}
