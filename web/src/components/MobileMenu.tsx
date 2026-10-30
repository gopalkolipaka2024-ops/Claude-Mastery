"use client";
import Link from "next/link";
import type { CategoryNode } from "@/lib/types";
import { Accordion, AccordionItem } from "./Accordion";
import { Dialog } from "./Dialog";

/** Category menu for phones. Loaded only when someone opens it. */
export default function MobileMenu({ categories, onClose }: { categories: CategoryNode[]; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title="Shop by category" placement="sheet">
      <Accordion>
        {categories.map((c) => c.children?.length ? (
          <AccordionItem key={c.href} title={c.name}>
            <ul className="flex flex-col">
              <li><Link href={c.href} onClick={onClose} className="flex min-h-11 items-center font-semibold text-primary">All {c.name}</Link></li>
              {c.children.map((s) => <li key={s.href}><Link href={s.href} onClick={onClose} className="flex min-h-11 items-center pl-3 hover:text-primary">{s.name}</Link></li>)}
            </ul>
          </AccordionItem>
        ) : (
          <Link key={c.href} href={c.href} onClick={onClose} className="flex min-h-11 items-center border-b border-border font-semibold">{c.name}</Link>
        ))}
      </Accordion>
    </Dialog>
  );
}
