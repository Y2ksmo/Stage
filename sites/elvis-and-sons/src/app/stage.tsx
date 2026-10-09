"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { initSound, onSoundMute, playShut, playSpace, setSoundMuted, soundMuted } from "./sound";

type Panel = {
  title: string;
  kicker: string;
  body: string;
  image?: string;
  alt?: string;
  href?: string;
};

function readPanel(card: HTMLElement): Panel {
  return {
    title: card.dataset.spaceTitle ?? "Elvis & Sons",
    kicker: card.dataset.spaceKicker ?? "",
    body: card.dataset.spaceBody ?? "",
    image: card.dataset.spaceImage,
    alt: card.dataset.spaceAlt,
    href: card.dataset.spaceHref,
  };
}

export function Stage() {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [warp, setWarp] = useState(0);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setMuted(initSound());
    return onSoundMute(setMuted);
  }, []);

  useEffect(() => {
    if (!panel) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        playShut();
        setPanel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      returnFocus.current?.focus();
    };
  }, [panel]);

  useEffect(() => {
    const open = (card: HTMLElement) => {
      returnFocus.current = card;
      setWarp((value) => value + 1);
      playSpace();
      setPanel(readPanel(card));
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest("[data-sound='off']") || target.closest(".elvis-haul")) return;
      if (target.closest("input, textarea, select, option")) return;
      const link = target.closest("a");
      const card = target.closest<HTMLElement>("[data-space-card]");
      if (link) {
        setWarp((value) => value + 1);
        playSpace();
        const href = link.getAttribute("href");
        const id = href?.includes("#") ? href.split("#")[1] : "";
        const section = id ? document.getElementById(id) : null;
        if (section) {
          section.classList.remove("elvis-opened");
          void section.offsetWidth;
          section.classList.add("elvis-opened");
        }
        return;
      }
      if (!card) {
        const button = target.closest("button");
        if (button) {
          setWarp((value) => value + 1);
          playSpace();
        }
        return;
      }
      event.preventDefault();
      open(card);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>("[data-space-card]");
      if (!card || target?.closest("a, button")) return;
      event.preventDefault();
      open(card);
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const dock = (
    <div className="elvis-sound-dock">
      <button
        type="button"
        data-sound="off"
        aria-pressed={!muted}
        onClick={() => {
          const next = !soundMuted();
          setSoundMuted(next);
          if (!next) playSpace();
        }}
      >
        {muted ? "Sound off" : "Sound on"}
      </button>
    </div>
  );

  const overlay = panel ? (
    <div className="elvis-space" role="presentation">
      <button type="button" data-sound="off" aria-label="Close" className="absolute inset-0 cursor-default" onClick={() => { playShut(); setPanel(null); }} />
      <div className="elvis-space-card relative" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {panel.image ? <img src={panel.image} alt={panel.alt ?? ""} /> : null}
        {panel.kicker ? <p className="kicker">{panel.kicker}</p> : null}
        <h2 id={titleId}>{panel.title}</h2>
        {panel.body ? <p className="body">{panel.body}</p> : null}
        <div className="elvis-space-actions">
          {panel.href ? (
            <a className="inline-flex min-h-11 items-center rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white" href={panel.href} onClick={() => setPanel(null)}>
              Request this service
            </a>
          ) : null}
          <button ref={closeRef} type="button" data-sound="off" className="inline-flex min-h-11 items-center rounded-lg border border-white/30 px-5 text-sm font-semibold" onClick={() => { playShut(); setPanel(null); }}>
            Close
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {warp > 0 ? <span key={warp} className="elvis-warp" aria-hidden="true" /> : null}
      {mounted ? createPortal(dock, document.body) : null}
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
