import { packageArt } from "@/lib/package-art";
import type { ArtInput } from "@/lib/catalog";
import { cn } from "@/lib/cn";

/** Server-rendered drawing of the product's package, used when there is no photo. */
export function PackageArt({ art, className }: { art: ArtInput; className?: string }) {
  return <div className={cn("package-art h-full w-full", className)} aria-hidden="true" dangerouslySetInnerHTML={{ __html: packageArt(art) }} />;
}
