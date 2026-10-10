"use client";

import { Component, useEffect, useRef, type ReactNode } from "react";
import { NavigationHUD } from "./NavigationHUD";
import { SatelliteLayer } from "./SatelliteLayer";
import { SpaceScene } from "./SpaceScene";
import { globeStore, onSatellite } from "./store";

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <div className="globe-boot">This browser could not start the WebGL scene.</div>;
    }
    return this.props.children;
  }
}

export function GlobeExperience() {
  const shell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousBody = document.body.style.background;
    const previousHtml = document.documentElement.style.background;
    document.body.style.background = "#02030a";
    document.documentElement.style.background = "#02030a";
    const onMove = (event: PointerEvent) => {
      globeStore.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      globeStore.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    const unsubscribe = onSatellite((value) => {
      const node = shell.current;
      if (!node) return;
      node.style.opacity = String(1 - value * 0.94);
      node.style.pointerEvents = value > 0.62 ? "none" : "auto";
    });
    return () => {
      document.body.style.background = previousBody;
      document.documentElement.style.background = previousHtml;
      window.removeEventListener("pointermove", onMove);
      unsubscribe();
    };
  }, []);

  return (
    <div className="globe-root">
      <div ref={shell} className="globe-stage">
        <SceneBoundary>
          <SpaceScene />
        </SceneBoundary>
      </div>
      <SatelliteLayer />
      <NavigationHUD />
      <div data-globe-scroll className="globe-scroll" />
    </div>
  );
}
