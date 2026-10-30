"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { ImageGallery as Gallery } from "./ImageGallery";

const ImageGallery = lazy(() => import("./ImageGallery").then((m) => ({ default: m.ImageGallery })));

/** The gallery's code (zoom dialog included) downloads only on pages that actually have photos. */
export function ImageGalleryLazy(props: ComponentProps<typeof Gallery>) {
  return <Suspense fallback={<div className="aspect-square rounded-lg border border-border bg-surface-sunken" />}><ImageGallery {...props} /></Suspense>;
}
