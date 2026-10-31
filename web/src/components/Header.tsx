"use client";
import Link from "next/link";
import { lazy, Suspense, useState } from "react";
import type { DayHours } from "@/config/store";
import type { CategoryNode } from "@/lib/types";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { MegaMenu } from "./MegaMenu";
import { SearchBox, type SuggestionGroups } from "./SearchBox";
import { StoreHours } from "./StoreHours";

const MobileMenu = lazy(() => import("./MobileMenu"));

export type HeaderProps = {
  categories: CategoryNode[];
  phone: { display: string; e164: string };
  hours: { week: DayHours[]; timeZone: string; holidays?: { date: string; label: string; hours: DayHours }[] };
  search: (q: string) => Promise<SuggestionGroups>;
  onSearch: (q: string) => void;
  now?: Date;
};

export function Header({ categories, phone, hours, search, onSearch, now }: HeaderProps) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-(--z-sticky) border-b-3 border-accent-600 bg-surface">
        <div className="bg-brand-800 text-neutral-0">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 text-sm">
            <span className="[&_*]:text-neutral-0"><StoreHours variant="compact" {...hours} now={now} /></span>
            <a href={`tel:${phone.e164}`} className="inline-flex min-h-11 items-center gap-1 font-semibold hover:underline">
              <Icon name="phone" size={16} />Call {phone.display}
            </a>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <button type="button" className="tap-target inline-grid place-items-center rounded-md hover:bg-neutral-50 lg:hidden" aria-label="Open menu" aria-haspopup="dialog" onClick={() => setMenu(true)}>
            <Icon name="menu" />
          </button>
          <Logo />
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1"><SearchBox search={search} onSubmit={onSearch} /></div>
          <Link href="/store" className="hidden min-h-11 items-center gap-1 font-semibold text-primary hover:underline md:inline-flex"><Icon name="pin" size={18} />Visit us</Link>
        </div>
        <div className="mx-auto hidden max-w-7xl px-2 lg:block"><MegaMenu categories={categories} /></div>
      </header>
      {menu && <Suspense fallback={null}><MobileMenu categories={categories} onClose={() => setMenu(false)} /></Suspense>}
    </>
  );
}
