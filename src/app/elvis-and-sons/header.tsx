"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLink } from "./brand-link";
import { btnAccent, nav } from "./content";
import { IconClose, IconMenu } from "./icons";
import { Logo } from "./logo";

export function Header() {
  const pathname = usePathname();
  const menuId = useId();
  const home = pathname === "/elvis-and-sons";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState("top");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!home) return;
    const ids = ["top", "services", "about", "reviews", "quote", "contact"];
    const nodes = ids.map((id) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setCurrent(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [home]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const solid = !home || scrolled || open;
  const onDark = !solid;

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${solid ? "border-slate-200/80 bg-white/88 text-[#0F172A] shadow-[0_8px_30px_-18px_rgba(15,23,42,0.45)] backdrop-blur-xl" : "border-white/10 bg-[#0F172A]/45 text-white backdrop-blur-md"}`}>
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[1120px] items-center gap-4 px-5 sm:px-6 lg:px-8">
        <BrandLink href="/elvis-and-sons#top" ariaLabel="Elvis & Sons Multilink Ventures, home" className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB]" onNavigate={() => setOpen(false)}>
          <Logo onDark={onDark} />
        </BrandLink>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-5 lg:flex">
          {nav.map((item) => {
            const active = home && current === item.section;
            return (
              <BrandLink
                key={item.label}
                href={item.href}
                className={`relative py-1 text-sm font-medium transition hover:text-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB] ${active ? (onDark ? "text-white" : "text-[#0F172A]") : onDark ? "text-white/80" : "text-slate-600"}`}
              >
                {item.label}
                {active ? <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-[#D97706]" /> : null}
              </BrandLink>
            );
          })}
        </nav>

        <BrandLink href="/elvis-and-sons#quote" className="ml-2 hidden min-h-11 items-center justify-center rounded-lg bg-[#D97706] px-4 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:bg-[#B45309] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FBBF24] lg:inline-flex">
          Get a Quote
        </BrandLink>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <BrandLink href="/elvis-and-sons#quote" className={btnAccent} onNavigate={() => setOpen(false)}>
            Quote
          </BrandLink>
          <button
            type="button"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${solid ? "border-slate-300" : "border-white/25"}`}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {open ? (
        <div id={menuId} className="border-t border-slate-200 bg-white px-5 py-4 text-[#0F172A] shadow-lg lg:hidden">
          <nav aria-label="Mobile" className="mx-auto flex max-w-[1120px] flex-col">
            {nav.map((item) => (
              <BrandLink
                key={item.label}
                href={item.href}
                onNavigate={() => setOpen(false)}
                className="border-b border-slate-100 py-3 text-base font-medium text-[#0F172A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                {item.label}
              </BrandLink>
            ))}
            <BrandLink href="/elvis-and-sons#quote" className={`${btnAccent} mt-4 w-full`} onNavigate={() => setOpen(false)}>
              Get a Quote
            </BrandLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
