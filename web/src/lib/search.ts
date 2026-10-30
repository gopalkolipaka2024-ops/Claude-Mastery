import "server-only";
import MiniSearch from "minisearch";
import { getCatalog, type Product } from "./catalog";
import { SYNONYMS } from "@/config/synonyms";

/* Full-text index over the catalog: prefix matching, typo tolerance, synonyms.
   Built once per server process (~7k items, a few tens of ms). */
let built: { version: number; source: string; index: MiniSearch<Product>; byId: Map<number, Product> } | null = null;
async function idx() {
  const cat = await getCatalog();
  if (built && built.version === cat.version && built.source === cat.source) return built;
  const deptName = Object.fromEntries(cat.departments().map((d) => [d.slug, d.name]));
  const index = new MiniSearch<Product>({
    fields: ["name", "brand", "category", "deptName", "size", "varietal", "country"],
    storeFields: ["id", "rank"],
    extractField: (doc, field) => (field === "deptName" ? deptName[doc.dept] : ((doc as unknown as Record<string, unknown>)[field] ?? "")) as string,
    searchOptions: {
      // Partial-word matching only on the word still being typed, so "coors lite" doesn't pull in "lime" or "litter".
      boost: { name: 3, brand: 2, category: 1.5 }, prefix: (_term, i, terms) => i === terms.length - 1, combineWith: "AND",
      fuzzy: (term) => (term.length > 4 ? 0.2 : term.length > 3 ? 1 : 0),
      // Gentle nudge toward the store's best sellers (rank 1 = most popular).
      boostDocument: (_id, _term, stored) => 1 + 0.6 / Math.log2(2 + ((stored?.rank as number) ?? 9999) / 50),
    },
  });
  const all = cat.all();
  index.addAll(all);
  built = { version: cat.version, source: cat.source, index, byId: new Map(all.map((p) => [p.id, p])) };
  return built;
}

/** Expands synonyms, e.g. "cab" also searches "cabernet". */
export function expand(q: string) {
  const t = q.toLowerCase().trim().replace(/\s+/g, " ");
  const extra = Object.entries(SYNONYMS).flatMap(([k, vs]) => {
    const re = new RegExp(`(^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|\\s)`);
    return re.test(t) ? vs.map((v) => t.replace(re, `$1${v}`)) : []; // "coors lite" → "coors light", never "light" alone
  });
  return [t, ...new Set(extra)];
}

/** Ranked product ids for a query. AND match first; if nothing, fall back to OR so near misses still show. */
export async function searchIds(q: string): Promise<number[]> {
  const terms = expand(q);
  if (!terms[0]) return [];
  const { index } = await idx();
  const score = new Map<number, number>();
  for (const [i, term] of terms.entries()) {
    for (const r of index.search(term)) score.set(r.id as number, Math.max(score.get(r.id as number) ?? 0, r.score * (i === 0 ? 1 : 0.8)));
  }
  if (!score.size) {
    // Run-together words ("budlight"): try splitting each long word in two.
    const words = terms[0].split(" ");
    let best: { id: number; score: number }[] = [];
    words.forEach((w, wi) => {
      if (w.length < 6) return;
      for (let i = 3; i <= w.length - 3; i++) {
        const tryQ = [...words.slice(0, wi), w.slice(0, i), w.slice(i), ...words.slice(wi + 1)].join(" ");
        const r = index.search(tryQ, { fuzzy: 0 }).map((x) => ({ id: x.id as number, score: x.score }));
        if (r.length && (r[0]!.score > (best[0]?.score ?? 0))) best = r;
      }
    });
    for (const r of best) score.set(r.id, r.score);
  }
  if (!score.size) for (const r of index.search(terms[0], { combineWith: "OR" })) score.set(r.id as number, r.score * 0.5);
  return [...score].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** "Did you mean" from MiniSearch's fuzzy auto-suggest. */
export async function didYouMean(q: string) {
  const s = (await idx()).index.autoSuggest(q, { fuzzy: 0.3 })[0];
  return s && s.suggestion !== q.toLowerCase() ? s.suggestion : null;
}

export async function suggest(q: string) {
  const ids = (await searchIds(q)).slice(0, 6);
  const { byId } = await idx();
  const cat = await getCatalog();
  const t = q.toLowerCase();
  const brandNames = [...new Set(ids.map((id) => byId.get(id)?.brand).filter((b): b is string => !!b && b.toLowerCase().includes(t)))].slice(0, 3);
  const categories = cat.departments().flatMap((d) => [
    ...(d.name.toLowerCase().includes(t) ? [{ label: d.name, href: `/c/${d.slug}`, meta: `${d.count.toLocaleString()} items` }] : []),
    ...d.children.filter((a) => a.name.toLowerCase().includes(t)).map((a) => ({ label: a.name, href: `/c/${d.slug}/${a.slug}`, meta: d.name })),
  ]).slice(0, 4);
  return {
    products: ids.map((id) => byId.get(id)!).map((p) => ({ label: p.name, href: `/p/${p.slug}`, meta: p.size ?? undefined })),
    brands: brandNames.map((b) => ({ label: b, href: `/search?q=${encodeURIComponent(b)}` })),
    categories,
  };
}

// Build the index when the server starts, so the first search is as fast as the rest.
idx().catch(() => {});
