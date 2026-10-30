"use client";
import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

/** Main image + thumbnails. Arrow keys switch images; click (or Enter) opens a full-size zoom view. */
export function ImageGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const cur = images[i];
  if (!cur) {
    return <div className="grid aspect-square place-items-center rounded-lg bg-surface-sunken text-neutral-300" role="img" aria-label={`No image yet for ${name}`}><Icon name="bottle" size={80} /></div>;
  }
  const go = (d: number) => setI((n) => (n + d + images.length) % images.length);
  const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
  return (
    <div className="flex flex-col gap-3" onKeyDown={onKey}>
      <button type="button" onClick={() => setZoom(true)} aria-label={`Zoom image ${i + 1} of ${images.length}: ${cur.alt}`}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`); }}
        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface cursor-zoom-in">
        <Image src={cur.src} alt={cur.alt} fill priority sizes="(min-width: 1024px) 560px, 100vw"
          style={{ transformOrigin: origin }} className="object-contain p-6 transition-transform duration-(--duration-base) group-hover:scale-150" />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md bg-surface/90 px-2 py-1 text-xs font-semibold text-text-muted"><Icon name="zoom" size={14} />Zoom</span>
      </button>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label="Product images">
          {images.map((im, n) => (
            <li key={im.src}>
              <button type="button" onClick={() => setI(n)} aria-label={`Show image ${n + 1}`} aria-current={n === i || undefined}
                className={cn("relative size-16 overflow-hidden rounded-md border-2 bg-surface", n === i ? "border-primary" : "border-border hover:border-border-strong")}>
                <Image src={im.src} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={zoom} onClose={() => setZoom(false)} title={name}>
        <div className="relative aspect-square w-full"><Image src={cur.src} alt={cur.alt} fill sizes="90vw" className="object-contain" /></div>
        {images.length > 1 && (
          <div className="mt-3 flex justify-between">
            <button type="button" onClick={() => go(-1)} className="tap-target inline-grid place-items-center rounded-md hover:bg-neutral-50" aria-label="Previous image"><Icon name="chevronLeft" /></button>
            <p className="self-center text-sm text-text-muted">{i + 1} of {images.length}</p>
            <button type="button" onClick={() => go(1)} className="tap-target inline-grid place-items-center rounded-md hover:bg-neutral-50" aria-label="Next image"><Icon name="chevronRight" /></button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
