import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { store } from "@/config/store";

/* Shared frame for social share images (1200x630). The display font is read from the
   @fontsource package because the image renderer needs WOFF, not WOFF2. */
export const OG_SIZE = { width: 1200, height: 630 };
const C = { navy: "#14295a", deep: "#0b1734", pale: "#d9e1f1", red: "#e03550", white: "#ffffff" };

let font: Promise<Buffer> | null = null;
export const ogFonts = async () => [{
  name: "Big Shoulders", weight: 800 as const, style: "normal" as const,
  data: await (font ??= readFile(join(process.cwd(), "node_modules/@fontsource/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff"))),
}];

export function OgFrame({ children, art }: { children: ReactNode; art?: ReactNode }) {
  const a = store.address;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: C.navy, color: C.white, fontFamily: "Big Shoulders" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 64px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: 96, height: 10, background: C.red, marginBottom: 28 }} />
          {children}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 34, color: C.pale, lineHeight: 1.2 }}>
          <span style={{ color: C.white, fontSize: 40 }}>{store.name}</span>
          <span>{`${a.street}, ${a.city}, ${a.region} · ${store.phone.display}`}</span>
        </div>
      </div>
      {art && <div style={{ display: "flex", width: 420, alignItems: "center", justifyContent: "center", background: C.deep }}>{art}</div>}
    </div>
  );
}
