"use client";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

const load = () => import("./Dialog");
const Dialog = lazy(() => load().then((m) => ({ default: m.Dialog })));

/** Phone filters: a button that opens the server-rendered filter links in a bottom sheet. */
export function ListingSheet({ children, active, total }: { children: ReactNode; active: number; total: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} onPointerDown={load} onFocus={load} aria-haspopup="dialog"
        className="inline-flex h-11 items-center gap-2 rounded-md border border-border-input bg-surface px-4 font-semibold text-primary hover:border-primary">
        <Icon name="filter" size={18} />Filter{active > 0 && <span className="rounded-full bg-primary px-2 text-xs text-on-primary">{active}</span>}
      </button>
      {open && (
        <Suspense fallback={null}>
          <Dialog open onClose={() => setOpen(false)} title="Filter" placement="sheet"
            footer={<button type="button" onClick={() => setOpen(false)} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-lg font-semibold text-on-primary hover:bg-primary-hover">Show {total.toLocaleString()} results</button>}>
            <div onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>{children}</div>
          </Dialog>
        </Suspense>
      )}
    </>
  );
}
