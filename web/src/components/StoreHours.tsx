"use client";
import { useSyncExternalStore } from "react";
import type { DayHours } from "@/config/store";
import { DAY_NAMES, openStatus, storeClock } from "@/lib/hours";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const currentMinute = () => Math.floor(Date.now() / 60_000);
const subscribeMinute = (cb: () => void) => { const t = setInterval(cb, 15_000); return () => clearInterval(t); };

type Props = { week: DayHours[]; timeZone: string; holidays?: { date: string; label: string; hours: DayHours }[]; variant?: "compact" | "full"; now?: Date };

/** "Open until 10 pm" status plus the week. Status is computed in the store's time zone and refreshes every minute. */
export function StoreHours({ week, timeZone, holidays = [], variant = "full", now: fixedNow }: Props) {
  // The current minute, read in the browser only (the server renders no open/closed status)
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, () => null);
  const now = fixedNow ?? (minute == null ? null : new Date(minute * 60_000));
  const status = now ? openStatus(now, timeZone, week, holidays) : null;
  const today = now ? storeClock(now, timeZone).day : -1;

  const badge = (
    <span className={cn("inline-flex items-center gap-2 font-semibold", status?.open ? "text-success-600" : "text-danger-600")}>
      <span aria-hidden="true" className={cn("size-2 rounded-full", status?.open ? "bg-success-600" : "bg-danger-600")} />
      {status ? status.label : "Hours"}
    </span>
  );
  if (variant === "compact") return <span className="inline-flex items-center gap-2 text-sm"><Icon name="clock" size={16} />{badge}</span>;

  return (
    <section aria-labelledby="hours-title" className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="hours-title" className="text-2xl text-primary">Store hours</h2>
        {badge}
      </div>
      {status?.holiday && <p className="mt-2 rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-700">Holiday hours today: {status.holiday}</p>}
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Opening hours by day</caption>
        <tbody>
          {DAY_NAMES.map((d, i) => {
            const h = week[i] ?? null;
            return (
              <tr key={d} className={cn("border-t border-border", i === today && "font-semibold text-primary")}>
                <th scope="row" className="py-2 text-left font-[inherit]">{d}{i === today && <span className="sr-only"> (today)</span>}</th>
                <td className="py-2 text-right tabular-nums">{h ? `${formatTime(h.open)} – ${formatTime(h.close)}` : "Closed"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {holidays.length > 0 && (
        <div className="mt-3">
          <h3 className="font-sans text-sm font-semibold">Holiday hours</h3>
          <ul className="mt-1 text-sm text-text-muted">
            {holidays.map((h) => <li key={h.date}>{h.label}: {h.hours ? `${formatTime(h.hours.open)} – ${formatTime(h.hours.close)}` : "Closed"}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
