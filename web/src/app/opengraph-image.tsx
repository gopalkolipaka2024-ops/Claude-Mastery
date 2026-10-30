import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";
import { store } from "@/config/store";

export const alt = `${store.name}: beer, wine, spirits, deli and groceries in ${store.address.city}, ${store.address.region}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <OgFrame>
      <span style={{ fontSize: 112, lineHeight: 0.95 }}>Cold beer.</span>
      <span style={{ fontSize: 112, lineHeight: 0.95 }}>Fresh deli.</span>
      <span style={{ fontSize: 112, lineHeight: 0.95 }}>One stop.</span>
    </OgFrame>,
    { ...size, fonts: await ogFonts() },
  );
}
