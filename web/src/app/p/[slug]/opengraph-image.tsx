import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";
import { getCatalog } from "@/lib/catalog";
import { standaloneArt } from "@/lib/package-art-svg";
import { store } from "@/config/store";
import { sizeBeyondName } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 86400;

export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = (await getCatalog()).product((await params).slug);
  return [{ id: "card", alt: p ? `${p.name} at ${store.name}` : store.name, size, contentType }];
}

/** Share card for a product: its name and size, with the package drawing (or photo). */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = (await getCatalog()).product((await params).slug);
  const fonts = await ogFonts();
  if (!p) return new ImageResponse(<OgFrame><span style={{ fontSize: 96 }}>{store.shortName}</span></OgFrame>, { ...size, fonts });
  const src = `data:image/svg+xml;base64,${Buffer.from(standaloneArt(p.art)).toString("base64")}`;
  const long = p.name.length > 34;
  const extra = sizeBeyondName(p);
  return new ImageResponse(
    <OgFrame art={<img src={src} width={300} height={400} alt="" style={{ objectFit: "contain" }} />}>
      <span style={{ fontSize: 30, color: "#d9e1f1", textTransform: "uppercase", letterSpacing: 2 }}>{p.category}</span>
      <span style={{ fontSize: long ? 72 : 96, lineHeight: 1, marginTop: 12 }}>{p.name}</span>
      {extra && <span style={{ fontSize: 44, color: "#d9e1f1", marginTop: 16 }}>{extra}</span>}
    </OgFrame>,
    { ...size, fonts },
  );
}
