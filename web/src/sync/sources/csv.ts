import { readFileSync } from "node:fs";
import type { PosItem } from "../types";
import { COLUMN_ALIASES, CATEGORY_MAP } from "./bottle-pos-mapping";

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

const money = (s: string | undefined) => {
  if (!s) return null;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
const int = (s: string | undefined) => {
  if (!s) return null;
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export type CsvReport = { items: PosItem[]; unmappedCategories: Record<string, number>; skipped: { line: number; reason: string }[]; columns: Record<string, string> };

/**
 * Reads a point-of-sale CSV export. Columns are found by name (see bottle-pos-mapping.ts),
 * so column order doesn't matter. Items whose POS category isn't in CATEGORY_MAP are kept
 * under a department/aisle named after the POS category and listed in the report, never guessed.
 */
export function csvItems(file: string): CsvReport {
  const [header = [], ...rows] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
  const norm = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const idx: Record<string, number> = {}, columns: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const i = header.findIndex((h) => aliases.includes(norm(h)));
    if (i >= 0) { idx[field] = i; columns[field] = header[i]!; }
  }
  if (idx.name == null) throw new Error(`CSV has no item name column. Looked for: ${COLUMN_ALIASES.name!.join(", ")}`);
  const get = (r: string[], f: string) => (idx[f] == null ? undefined : r[idx[f]!]?.trim() || undefined);
  const unmapped: Record<string, number> = {};
  const skipped: CsvReport["skipped"] = [];
  const items: PosItem[] = [];
  rows.forEach((r, n) => {
    const name = get(r, "name");
    if (!name) { skipped.push({ line: n + 2, reason: "no item name" }); return; }
    const posCat = get(r, "category") ?? get(r, "department") ?? "Uncategorized";
    const mapped = CATEGORY_MAP[posCat.toLowerCase()];
    if (!mapped) unmapped[posCat] = (unmapped[posCat] ?? 0) + 1;
    const upc = get(r, "upc")?.replace(/\D/g, "") || null;
    items.push({
      sku: get(r, "sku") ?? (upc ? `upc:${upc}` : `name:${name.toLowerCase()}`),
      name, upc, brand: get(r, "brand") ?? null,
      department: mapped?.[0] ?? (get(r, "department") ?? "Other"), aisle: mapped?.[1] ?? posCat,
      pack: get(r, "pack") ?? null, volume: get(r, "size") ?? null,
      priceCents: money(get(r, "price")), saleCents: money(get(r, "salePrice")),
      saleStartsAt: get(r, "saleStart") ?? null, saleEndsAt: get(r, "saleEnd") ?? null,
      quantity: int(get(r, "quantity")),
      active: !/^(no|false|0|inactive)$/i.test(get(r, "active") ?? "yes"),
    });
  });
  return { items, unmappedCategories: unmapped, skipped, columns };
}
