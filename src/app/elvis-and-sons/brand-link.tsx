"use client";

import Link from "next/link";
import type { QuoteKey, ServiceTab } from "./content";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
  tab?: ServiceTab;
  category?: QuoteKey;
  onNavigate?: () => void;
  ariaLabel?: string;
};

export function BrandLink({ href, className, children, tab, category, onNavigate, ariaLabel }: Props) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        if (tab) window.dispatchEvent(new CustomEvent("elvis-tab", { detail: tab }));
        if (category) window.dispatchEvent(new CustomEvent("elvis-category", { detail: category }));
        onNavigate?.();
      }}
    >
      {children}
    </Link>
  );
}
