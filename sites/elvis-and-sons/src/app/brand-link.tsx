"use client";

import Link from "next/link";
import type { QuoteKey } from "./content";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
  category?: QuoteKey;
  onNavigate?: () => void;
  ariaLabel?: string;
};

export function BrandLink({ href, className, children, category, onNavigate, ariaLabel }: Props) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        if (category) window.dispatchEvent(new CustomEvent("elvis-category", { detail: category }));
        onNavigate?.();
      }}
    >
      {children}
    </Link>
  );
}
