"use client";

import { useEffect, useState } from "react";
import { BrandLink } from "./brand-link";
import { cardTab, container, serviceLines, type ServiceTab } from "./content";
import { IconArrow, IconBuilding, IconHome, IconMonitor, IconNetwork, IconTruck, IconWorkflow } from "./icons";

const itIcons = [IconMonitor, IconNetwork, IconWorkflow];
const movingIcons = [IconHome, IconBuilding, IconTruck];

export function Services({ initialTab }: { initialTab: ServiceTab }) {
  const [tab, setTab] = useState<ServiceTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const onTab = (event: Event) => {
      const next = (event as CustomEvent<ServiceTab>).detail;
      if (next === "it" || next === "moving") setTab(next);
    };
    window.addEventListener("elvis-tab", onTab);
    return () => window.removeEventListener("elvis-tab", onTab);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const next = cardTab[hash];
    if (!next) return;
    setTab(next);
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [initialTab]);

  const line = serviceLines[tab];
  const icons = tab === "it" ? itIcons : movingIcons;

  function onTabKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next: ServiceTab = tab === "it" ? "moving" : "it";
    setTab(next);
    document.getElementById(next === "it" ? "tab-it" : "tab-moving")?.focus();
  }

  return (
    <section id="services" className="scroll-mt-28 bg-white py-20 sm:py-24" aria-labelledby="services-heading">
      <div className={container}>
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">Services</p>
          <h2 id="services-heading" className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-4xl">
            Two core practices, delivered with the same standard
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#334155]">
            Choose the line of work you need. Each engagement is scoped, priced, and staffed before it starts.
          </p>
        </div>

        <div className="mt-8 inline-flex w-full rounded-xl bg-[#F1F5F9] p-1 sm:w-auto" role="tablist" aria-label="Service lines" onKeyDown={onTabKey}>
          {(["it", "moving"] as const).map((key) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                id={key === "it" ? "tab-it" : "tab-moving"}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={key === "it" ? "panel-it" : "panel-moving"}
                tabIndex={selected ? 0 : -1}
                className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:flex-none sm:px-5 ${selected ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-600 hover:text-[#0F172A]"}`}
                onClick={() => setTab(key)}
              >
                {serviceLines[key].label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={tab === "it" ? "panel-it" : "panel-moving"}
          aria-labelledby={tab === "it" ? "tab-it" : "tab-moving"}
          className="mt-6"
        >
          <p className="max-w-2xl text-[#334155]">{line.summary}</p>
          <ul className="mt-6 grid gap-5 lg:grid-cols-3">
            {line.items.map((item, index) => {
              const Icon = icons[index] ?? IconMonitor;
              const warm = tab === "moving";
              return (
                <li key={item.id}>
                  <article id={item.id} className="group flex h-full scroll-mt-28 flex-col rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 transition duration-200 hover:-translate-y-1 hover:border-[#2563EB]/35 hover:bg-white hover:shadow-[0_20px_40px_-28px_rgba(15,23,42,0.55)]">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${warm ? "bg-[#FFFBEB] text-[#B45309]" : "bg-[#EFF6FF] text-[#1D4ED8]"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">{item.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-[#334155]">{item.body}</p>
                    <BrandLink
                      href={`/elvis-and-sons?category=${item.quote}#quote`}
                      category={item.quote}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB]"
                    >
                      Include in a quote
                      <IconArrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </BrandLink>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
