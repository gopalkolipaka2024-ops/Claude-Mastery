"use client";
import { useState } from "react";
import { Icon } from "./Icon";

/**
 * Click-to-load map. Nothing from Google loads until the visitor asks for it,
 * which keeps the page fast and avoids third-party tracking by default.
 */
export function MapEmbed({ query, title, directionsHref, address }: { query: string; title: string; directionsHref: string; address: string }) {
  const [load, setLoad] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative aspect-[16/10] bg-brand-50">
        {load && !failed ? (
          <iframe title={title} src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`} loading="lazy"
            referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 size-full border-0" onError={() => setFailed(true)} />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-surface text-accent-600 shadow-sm"><Icon name="pin" size={26} /></span>
              <p className="font-semibold">{address}</p>
              {failed ? <p className="text-sm text-danger-600" role="alert">The map couldn&apos;t load. Use the directions link below.</p> : (
                <button type="button" onClick={() => setLoad(true)} className="min-h-11 rounded-md border border-border-input bg-surface px-4 font-semibold text-primary hover:border-primary">
                  Show map
                </button>
              )}
              <p className="text-xs text-text-muted">Loads Google Maps</p>
            </div>
          </div>
        )}
      </div>
      <a href={directionsHref} target="_blank" rel="noopener" className="flex min-h-11 items-center justify-center gap-2 border-t border-border font-semibold text-primary hover:bg-brand-50">
        <Icon name="pin" size={18} />Get directions
      </a>
    </div>
  );
}
