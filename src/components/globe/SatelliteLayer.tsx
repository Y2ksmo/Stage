"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getPlace } from "./geo";
import { projectMercator } from "./math";
import { onSatellite } from "./store";
import { useGlobeSnap } from "./useGlobeSnap";

const ZOOM = 15;
const TILE = 256;

function roadsFor(seedKey: string) {
  let seed = 0;
  for (let index = 0; index < seedKey.length; index += 1) seed = (seed * 33 + seedKey.charCodeAt(index)) >>> 0;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const lines: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    const x1 = 18 + next() * 64;
    const y1 = 16 + next() * 68;
    const x2 = x1 + (next() - 0.5) * 36;
    const y2 = y1 + (next() - 0.45) * 28;
    const x3 = x2 + (next() - 0.5) * 24;
    const y3 = y2 + (next() - 0.5) * 22;
    lines.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)}`);
  }
  return lines;
}

function TileImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="sat-tile sat-tile-empty" />;
  return (
    <img
      className="sat-tile"
      alt=""
      width={TILE}
      height={TILE}
      src={src}
      draggable={false}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function SatelliteLayer() {
  const snap = useGlobeSnap();
  const root = useRef<HTMLDivElement>(null);
  const city = getPlace(snap.pathIds[2]);
  const [span, setSpan] = useState({ cols: 9, rows: 7 });

  useEffect(() => onSatellite((value) => {
    const node = root.current;
    if (!node) return;
    node.style.opacity = String(value);
    node.style.visibility = value < 0.02 ? "hidden" : "visible";
    const scale = 1.08 - value * 0.08;
    node.style.transform = `scale(${scale})`;
  }), []);

  useEffect(() => {
    const measure = () => {
      const cols = Math.ceil(window.innerWidth / TILE) + 2;
      const rows = Math.ceil(window.innerHeight / TILE) + 2;
      setSpan({
        cols: cols % 2 === 0 ? cols + 1 : cols,
        rows: rows % 2 === 0 ? rows + 1 : rows,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const layout = useMemo(() => {
    if (!city) return null;
    const frac = projectMercator(city.lat, city.lon, ZOOM);
    const halfCols = Math.floor(span.cols / 2);
    const halfRows = Math.floor(span.rows / 2);
    const col0 = Math.floor(frac.x) - halfCols;
    const row0 = Math.floor(frac.y) - halfRows;
    return {
      left: `calc(50% - ${(frac.x - col0) * TILE}px)`,
      top: `calc(50% - ${(frac.y - row0) * TILE}px)`,
      col0,
      row0,
    };
  }, [city, span.cols, span.rows]);

  const roads = useMemo(() => roadsFor(city?.id ?? "map"), [city?.id]);
  const armed = snap.level >= 2 && city && layout;
  const wrap = 2 ** ZOOM;

  return (
    <div ref={root} className="sat-layer" aria-hidden="true">
      <div className="sat-fallback">
        <strong>{city?.name}</strong>
        <span>Local vector lock</span>
      </div>
      {armed ? (
        <div className="sat-grid" style={{ left: layout.left, top: layout.top, width: span.cols * TILE }}>
          {Array.from({ length: span.rows }, (_, row) => (
            <div className="sat-row" key={row}>
              {Array.from({ length: span.cols }, (_, col) => {
                const x = layout.col0 + col;
                const y = layout.row0 + row;
                const wrappedX = ((x % wrap) + wrap) % wrap;
                if (y < 0 || y >= wrap) return <div className="sat-tile sat-tile-empty" key={col} />;
                const imagery = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${y}/${wrappedX}`;
                const labels = `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${ZOOM}/${y}/${wrappedX}`;
                return (
                  <div className="sat-cell" key={col}>
                    <TileImage src={imagery} />
                    <TileImage src={labels} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
      <svg className="sat-vectors" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle cx="50" cy="50" r="8" />
        <circle cx="50" cy="50" r="16" />
        <circle cx="50" cy="50" r="27" />
        <path d="M50 8 V92 M8 50 H92" />
        {roads.map((line) => <path key={line} d={line} />)}
      </svg>
      <div className="sat-reticle" />
    </div>
  );
}
