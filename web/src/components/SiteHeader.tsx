"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Header, type HeaderProps } from "./Header";
import type { SuggestionGroups } from "./SearchBox";

/** Header wired to the live suggestion API and the search page. */
export function SiteHeader(props: Omit<HeaderProps, "search" | "onSearch">) {
  const router = useRouter();
  const search = useCallback(async (q: string): Promise<SuggestionGroups> => {
    const r = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }, []);
  return <Header {...props} search={search} onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)} />;
}
