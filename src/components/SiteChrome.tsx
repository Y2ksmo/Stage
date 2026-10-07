"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const brandSite = pathname === "/elvis-and-sons" || pathname.startsWith("/elvis-and-sons/");

  if (brandSite) return children;

  return (
    <>
      <a href="#main" className="skip-link">Ga naar de inhoud</a>
      <Header />
      <div id="main" tabIndex={-1}>{children}</div>
      <Footer />
    </>
  );
}
