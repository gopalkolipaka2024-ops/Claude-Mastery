import type { DayHours } from "@/config/store";
import { formatTime } from "./format";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Day of week, minutes since midnight and ISO date in the store's time zone. */
export function storeClock(now: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday ?? "Sun");
  return { day, minutes: Number(parts.hour) * 60 + Number(parts.minute), date: `${parts.year}-${parts.month}-${parts.day}` };
}

const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export type OpenStatus = { open: boolean; label: string; todayLabel: string; holiday?: string };

export function openStatus(
  now: Date,
  timeZone: string,
  week: DayHours[],
  holidays: { date: string; label: string; hours: DayHours }[] = [],
): OpenStatus {
  const { day, minutes, date } = storeClock(now, timeZone);
  const holiday = holidays.find((h) => h.date === date);
  const today = holiday ? holiday.hours : week[day] ?? null;
  const todayLabel = today ? `${formatTime(today.open)} – ${formatTime(today.close)}` : "Closed";
  if (today && minutes >= toMin(today.open) && minutes < toMin(today.close)) {
    return { open: true, label: `Open until ${formatTime(today.close)}`, todayLabel, holiday: holiday?.label };
  }
  if (today && minutes < toMin(today.open)) {
    return { open: false, label: `Opens at ${formatTime(today.open)}`, todayLabel, holiday: holiday?.label };
  }
  for (let i = 1; i <= 7; i++) {
    const next = week[(day + i) % 7];
    if (next) {
      return { open: false, label: `Opens ${i === 1 ? "tomorrow" : DAY_NAMES[(day + i) % 7]} at ${formatTime(next.open)}`, todayLabel, holiday: holiday?.label };
    }
  }
  return { open: false, label: "Closed", todayLabel, holiday: holiday?.label };
}
