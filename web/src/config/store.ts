/* Store facts. Only details the owner has provided are filled in; anything
   still missing is null and is shown as "call for details", never guessed. */
export type DayHours = { open: string; close: string } | null; // 24h "HH:MM"; null = closed

export const store = {
  name: "Adams Shore Super Market & Liquors",
  shortName: "Adams Shore",
  address: {
    street: "494 Sea St #55",
    city: "Quincy",
    region: "MA",
    postalCode: "02169",
    country: "US",
  },
  phone: { display: "(617) 472-6455", e164: "+16174726455" },
  email: null as string | null, // TODO(owner): contact email
  timeZone: "America/New_York",
  /* Sunday = 0 */
  hours: [
    { open: "07:00", close: "22:00" },
    { open: "07:00", close: "22:00" },
    { open: "07:00", close: "22:00" },
    { open: "07:00", close: "22:00" },
    { open: "07:00", close: "22:00" },
    { open: "07:00", close: "22:00" },
    { open: "07:00", close: "22:00" },
  ] as DayHours[],
  holidayHours: [] as { date: string; label: string; hours: DayHours }[], // TODO(owner): holiday hours
  parking: null as string | null, // TODO(owner): parking details
  neighborhoods: ["Houghs Neck", "Germantown", "Merrymount", "Adams Shore"],
} as const;

export const directionsUrl = () =>
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(`${store.name}, ${store.address.street}, ${store.address.city}, ${store.address.region} ${store.address.postalCode}`);
