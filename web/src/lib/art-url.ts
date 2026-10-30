import type { ArtInput } from "./catalog";

/** FNV-1a hash of the drawing's inputs, so the image URL changes whenever the drawing would. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
/** Cacheable URL for a product's package drawing (served by app/art/[file]). */
export const artUrl = (a: ArtInput) => `/art/${a.id}-${hash(JSON.stringify([a.name, a.dept, a.aisle, a.shape, a.body, a.ink, a.flv]))}.svg`;
