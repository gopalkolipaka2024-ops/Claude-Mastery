import { getImageProps } from "next/image";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Product photo without client JavaScript: next/image's optimizer (AVIF/WebP, responsive srcset)
 * through getImageProps, rendered as a plain <img>. The blur preview is a background in the same
 * contain box, so the loaded photo simply covers it.
 */
export function Photo({ image, sizes, priority = false, className, alt = image.alt }: {
  image: ProductImage; sizes: string; priority?: boolean; className?: string; alt?: string;
}) {
  const { props } = getImageProps({
    src: image.src, alt, width: image.width, height: image.height, sizes,
    loading: priority ? "eager" : "lazy", fetchPriority: priority ? "high" : "auto",
  });
  const { style: _style, ...rest } = props;
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt comes from props
    <img {...rest} decoding="async" className={cn("h-full w-full object-contain", className)}
      style={image.blur ? { backgroundImage: `url(${image.blur})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundOrigin: "content-box" } : undefined} />
  );
}
