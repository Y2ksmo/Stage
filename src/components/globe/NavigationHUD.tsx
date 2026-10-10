"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ancestorChain, getPlace, pathSlot } from "./geo";
import { formatCoord } from "./math";
import { getSnap, go } from "./store";
import { useGlobeSnap } from "./useGlobeSnap";

const LEVELS = ["Space", "Continent", "Country", "Town"] as const;

export function NavigationHUD() {
  const snap = useGlobeSnap();
  const focus = snap.focusId ? getPlace(snap.focusId) : undefined;
  const target = snap.targetId ? getPlace(snap.targetId) : undefined;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const current = getSnap();
      if (event.key === "Escape" || event.key === "ArrowUp") {
        event.preventDefault();
        if (current.level <= 1) go(null);
        else if (current.level === 2) go(pathSlot(current.pathIds, 0));
        else go(pathSlot(current.pathIds, 1));
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (current.level === 0) go(pathSlot(current.pathIds, 0));
        else if (current.level === 1) go(pathSlot(current.pathIds, 1));
        else if (current.level === 2) go(pathSlot(current.pathIds, 2));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "Space" }];
  const trail = [pathSlot(snap.pathIds, 0), pathSlot(snap.pathIds, 1), pathSlot(snap.pathIds, 2)];
  for (let index = 0; index < snap.level; index += 1) {
    const place = getPlace(trail[index] ?? "");
    if (place) crumbs.push({ id: place.id, name: place.name });
  }

  const descendId = snap.level === 0 ? pathSlot(snap.pathIds, 0) : snap.level === 1 ? pathSlot(snap.pathIds, 1) : snap.level === 2 ? pathSlot(snap.pathIds, 2) : null;
  const descendName = descendId ? getPlace(descendId)?.name : null;

  return (
    <div className="globe-hud text-white">
      <div className="sr-only" aria-live="polite">
        {focus ? `${LEVELS[snap.level]} view, ${ancestorChain(focus.id).join(", ")}` : "Space view of Earth"}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between md:p-6">
      <header className="pointer-events-auto flex max-w-[16rem] flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-sky-100/70">Orbital index</p>
        <h1 className="text-lg font-semibold tracking-tight text-white md:text-xl">Global infrastructure</h1>
        <Link href="/" className="w-fit text-xs uppercase tracking-[0.22em] text-white/60 hover:text-white">
          Exit
        </Link>
      </header>

      <nav aria-label="Zoom breadcrumb" className="pointer-events-auto w-full md:w-auto md:max-w-xl md:flex-1">
        <ol className="flex flex-wrap items-center justify-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {crumbs.map((crumb, index) => {
            const current = index === crumbs.length - 1;
            return (
              <li key={`${crumb.name}-${index}`} className="flex items-center">
                {index > 0 ? <span className="px-1 text-white/35" aria-hidden="true">/</span> : null}
                <button
                  type="button"
                  aria-current={current ? "location" : undefined}
                  disabled={current}
                  onClick={() => go(crumb.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${current ? "text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
                >
                  {crumb.name}
                </button>
              </li>
            );
          })}
        </ol>
        {snap.animating ? (
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.32em] text-sky-100/80">
            Routing · {target?.name ?? "Space"}
          </p>
        ) : null}
      </nav>
      <div className="hidden w-40 shrink-0 md:block" aria-hidden="true" />
      </div>

      <ol className="pointer-events-auto absolute right-5 top-36 hidden flex-col gap-3 md:flex">
        {LEVELS.map((label, index) => {
          const active = snap.level === index;
          const id = index === 0 ? null : index === 1 ? pathSlot(snap.pathIds, 0) : index === 2 ? pathSlot(snap.pathIds, 1) : pathSlot(snap.pathIds, 2);
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => go(id)}
                className="group flex items-center gap-3"
                aria-current={active ? "step" : undefined}
              >
                <span className={`h-2.5 w-2.5 rounded-full border ${active ? "border-sky-200 bg-sky-200 shadow-[0_0_12px_rgba(160,210,255,0.9)]" : "border-white/40 bg-transparent group-hover:border-white"}`} />
                <span className={`text-[10px] uppercase tracking-[0.22em] ${active ? "text-white" : "text-white/50 group-hover:text-white"}`}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {snap.level === 0 ? (
        <div className="pointer-events-auto absolute bottom-6 left-4 max-w-sm md:left-6">
          <p className="text-sm text-white/80">Scroll, or select a label, to leave orbit.</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">Drag to look around · Esc returns upward</p>
          {descendName ? (
            <button
              type="button"
              onClick={() => descendId && go(descendId)}
              className="mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-xl hover:bg-white/20"
            >
              Descend · {descendName}
            </button>
          ) : null}
        </div>
      ) : null}

      {focus ? (
        <aside className="pointer-events-auto absolute bottom-4 left-4 right-4 rounded-3xl border border-white/15 bg-slate-950/55 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl md:left-auto md:w-[24rem]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-sky-100/70">{LEVELS[snap.level]}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{focus.name}</h2>
          <p className="mt-1 font-mono text-xs text-sky-100/80">{formatCoord(focus.lat, focus.lon)}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">{focus.summary}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {focus.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-[10px] uppercase tracking-[0.18em] text-white/45">{stat.label}</dt>
                <dd className="text-sm text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
          {descendName && snap.level < 3 ? (
            <button
              type="button"
              onClick={() => descendId && go(descendId)}
              className="mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] hover:bg-white/20"
            >
              Descend · {descendName}
            </button>
          ) : null}
          {snap.level === 3 ? (
            <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-white/50">
              Satellite lock · zoom 15. Surface imagery replaces the globe texture at this distance.
              Imagery © Esri, Maxar, Earthstar Geographics. Labels © Esri.
            </p>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
