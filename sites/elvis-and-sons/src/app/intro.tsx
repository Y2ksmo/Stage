"use client";

import { useEffect, useRef, useState } from "react";
import { endHaul, initSound, onSoundMute, playHaul, setSoundMuted, soundMuted, unlockSound } from "./sound";

export function Intro() {
  const [gone, setGone] = useState(false);
  const [armed, setArmed] = useState(false);
  const [launch, setLaunch] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const phase = useRef<"load" | "launch">("load");
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    setMuted(initSound());
    return onSoundMute(setMuted);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains("elvis-go")) {
      setGone(true);
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.classList.add("elvis-go");
      root.classList.remove("elvis-intro");
      setGone(true);
      return;
    }

    setArmed(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let fly = 0;
    let done = 0;
    function finish() {
      window.clearTimeout(fly);
      window.clearTimeout(done);
      endHaul();
      root.classList.add("elvis-go");
      root.classList.remove("elvis-intro");
      document.body.style.overflow = previous;
      setLeaving(true);
      window.setTimeout(() => setGone(true), 560);
    }
    finishRef.current = finish;
    fly = window.setTimeout(() => {
      phase.current = "launch";
      setLaunch(true);
    }, 750);
    done = window.setTimeout(() => finish(), 1580);

    const start = () => {
      const running = unlockSound();
      if (running.state === "running") {
        playHaul(phase.current);
        return;
      }
      void running.resume().then(() => playHaul(phase.current));
    };
    start();
    window.addEventListener("pointerdown", start);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(fly);
      window.clearTimeout(done);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  if (gone) return null;

  return (
    <div className={`elvis-haul${armed ? " is-armed" : ""}${launch ? " is-launch" : ""}${leaving ? " is-leaving" : ""}`} role="dialog" aria-label="Opening haul">
      <div className="elvis-sky" />
      <div className="elvis-stars" aria-hidden="true" />
      <div className="elvis-streaks" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="elvis-road" aria-hidden="true" />
      <p className="elvis-haul-label">{launch ? "Clear" : "Loading the haul"}</p>
      <div className="elvis-truck" aria-hidden="true">
        <Hauler />
        <span className="elvis-crate c1" />
        <span className="elvis-crate c2" />
        <span className="elvis-crate c3" />
        <span className="elvis-beam" />
      </div>
      <div className="elvis-haul-actions">
        <button type="button" data-sound="off" onClick={() => finishRef.current()}>
          Skip
        </button>
        <button
          type="button"
          data-sound="off"
          aria-pressed={!muted}
          onClick={() => {
            const next = !soundMuted();
            setSoundMuted(next);
            if (!next) {
              unlockSound();
              playHaul(phase.current);
            }
          }}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>
    </div>
  );
}

function Hauler() {
  return (
    <svg className="elvis-truck-svg" viewBox="0 0 900 280" fill="none" aria-hidden="true">
      <ellipse cx="430" cy="236" rx="300" ry="16" fill="#FBBF24" opacity="0.28" />
      <path d="M78 196h690" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
      <path d="M96 188V132h360l42 56H96Z" fill="#0F172A" stroke="#FBBF24" strokeWidth="4" />
      <path d="M118 150h92M230 150h92M342 150h70" stroke="#FBBF24" strokeWidth="3" opacity="0.7" />
      <path d="M498 196V118h150l92 58v20H498Z" fill="#111827" stroke="#E2E8F0" strokeWidth="4" />
      <path d="M548 128h78l62 40H548V128Z" fill="#7DD3FC" opacity="0.85" />
      <path d="M730 176h28" stroke="#F8FAFC" strokeWidth="8" strokeLinecap="round" />
      <circle cx="748" cy="176" r="8" fill="#FBBF24" />
      <g className="elvis-wheel">
        <circle cx="190" cy="208" r="42" fill="#020617" stroke="#E2E8F0" strokeWidth="7" />
        <circle cx="190" cy="208" r="12" fill="#FBBF24" />
      </g>
      <g className="elvis-wheel">
        <circle cx="690" cy="208" r="42" fill="#020617" stroke="#E2E8F0" strokeWidth="7" />
        <circle cx="690" cy="208" r="12" fill="#FBBF24" />
      </g>
    </svg>
  );
}
