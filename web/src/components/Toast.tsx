"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

type Tone = "neutral" | "success" | "error";
type ToastItem = { id: number; message: string; tone: Tone };
const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const push = useCallback((message: string, tone: Tone = "neutral") => {
    const id = next.current++;
    setItems((l) => [...l.slice(-2), { id, message, tone }]);
  }, []);
  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-toast) flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {items.map((t) => <Toast key={t.id} {...t} onClose={() => remove(t.id)} />)}
      </div>
    </Ctx.Provider>
  );
}

export function Toast({ message, tone = "neutral", onClose, duration = 4000 }: { message: string; tone?: Tone; onClose?: () => void; duration?: number }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || !onClose) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [paused, onClose, duration]);
  const icon = tone === "success" ? "check" : tone === "error" ? "alert" : "info";
  return (
    <div role={tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className={cn("pointer-events-auto flex max-w-md items-center gap-3 rounded-lg bg-neutral-900 py-2 pr-2 pl-4 text-neutral-0 shadow-lg animate-slide-up")}>
      <Icon name={icon} size={18} className={tone === "success" ? "text-success-50" : tone === "error" ? "text-accent-100" : "text-brand-100"} />
      <p className="text-sm">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="tap-target inline-grid place-items-center rounded-md hover:bg-white/10">
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
