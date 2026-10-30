"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: traps focus, closes on Escape or backdrop click, locks page scroll,
 * and returns focus to whatever opened it. `placement` makes it a centered dialog or a
 * bottom sheet (mobile filters).
 */
export function Dialog({ open, onClose, title, children, footer, placement = "center", labelledBy, closeOnBackdrop = true, hideClose = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
  placement?: "center" | "sheet"; labelledBy?: string; closeOnBackdrop?: boolean; hideClose?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !hideClose) { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const list = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!list.length) return;
      const a = list[0]!, z = list[list.length - 1]!;
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose, hideClose]);

  if (!open || typeof document === "undefined") return null;
  const sheet = placement === "sheet";
  return createPortal(
    <div className="fixed inset-0 z-(--z-modal) flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-neutral-900/55 animate-fade-in" aria-hidden="true" onClick={closeOnBackdrop ? onClose : undefined} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : title} tabIndex={-1}
        className={cn("relative flex max-h-[min(90vh,100dvh)] w-full flex-col bg-surface shadow-lg outline-none animate-slide-up",
          sheet ? "rounded-t-xl sm:max-w-lg sm:rounded-xl" : "m-4 max-w-lg rounded-xl")}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <h2 id={labelledBy} className="text-2xl text-primary">{title}</h2>
          {!hideClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="tap-target inline-grid place-items-center rounded-md hover:bg-neutral-50">
              <Icon name="x" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
