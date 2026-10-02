"use client";

import { usePathname } from "next/navigation";

/** Compact search box for the header. Hidden where the page already has a search box (home, search). */
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/search") return null;
  return (
    <form action="/search" method="get" role="search" className="header-search">
      <input name="q" type="search" minLength={2} maxLength={100} placeholder="Zoek leider of uitspraak…" aria-label="Zoeken" autoComplete="off" />
    </form>
  );
}
