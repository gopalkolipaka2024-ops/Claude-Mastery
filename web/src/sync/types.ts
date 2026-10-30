import { z } from "zod";

/** One sellable item as it comes from the point-of-sale system. `sku` is the stable key. */
export const posItem = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  department: z.string().min(1).max(80),
  aisle: z.string().min(1).max(80),
  upc: z.string().max(20).nullish(),
  brand: z.string().max(120).nullish(),
  pack: z.string().max(20).nullish(),
  volume: z.string().max(20).nullish(),
  priceCents: z.number().int().nonnegative().max(10_000_00).nullish(),
  saleCents: z.number().int().nonnegative().max(10_000_00).nullish(),
  saleStartsAt: z.iso.datetime({ offset: true }).or(z.iso.date()).nullish(),
  saleEndsAt: z.iso.datetime({ offset: true }).or(z.iso.date()).nullish(),
  quantity: z.number().int().min(-100_000).max(1_000_000).nullish(),
  description: z.string().max(4000).nullish(),
  abv: z.number().min(0).max(100).nullish(),
  country: z.string().max(80).nullish(),
  region: z.string().max(80).nullish(),
  varietal: z.string().max(80).nullish(),
  rank: z.number().int().positive().optional(),
  gameDay: z.boolean().optional(),
  note: z.string().max(400).nullish(),
  art: z.object({ dept: z.string(), aisle: z.string(), shape: z.string(), body: z.string(), ink: z.string(), flv: z.string() }).nullish(),
  active: z.boolean().optional(),
});
export type PosItem = z.infer<typeof posItem>;

/** A partial update from the webhook: only the fields that changed, matched by sku. */
export const posUpdate = posItem.partial().required({ sku: true });
export type PosUpdate = z.infer<typeof posUpdate>;

export type SyncResult = {
  runId: number; created: number; updated: number; deactivated: number; unchanged: number;
  unknownSkus: string[]; changedSlugs: string[]; changedDepartments: string[];
};
