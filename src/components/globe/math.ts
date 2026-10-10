import type { ZoomLevel } from "./store";

export const LEVEL_PROGRESS: readonly [number, number, number, number] = [0.02, 0.34, 0.6, 0.9];

const KEYS: readonly { p: number; distance: number; pitch: number }[] = [
  { p: 0, distance: 4.75, pitch: 0.18 },
  { p: 0.12, distance: 4.35, pitch: 0.24 },
  { p: 0.34, distance: 2.32, pitch: 0.42 },
  { p: 0.6, distance: 1.34, pitch: 0.58 },
  { p: 0.9, distance: 1.18, pitch: 0.82 },
  { p: 1, distance: 1.12, pitch: 0.9 },
];

export type Sample = {
  distance: number;
  pitch: number;
  satellite: number;
  level: ZoomLevel;
  focusId: string | null;
  lat: number;
  lon: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Equirectangular mapping that matches Three.js SphereGeometry UVs (Greenwich at the texture center). */
export function latLonToVector(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  const sinPhi = Math.sin(phi);
  return [
    -radius * Math.cos(theta) * sinPhi,
    radius * Math.cos(phi),
    radius * Math.sin(theta) * sinPhi,
  ];
}

/** Opening yaw frames Europe and Africa, the default descent route. */
export const OPENING_YAW = yawToFace(18, 12);

/** Y rotation that brings a geographic point onto the camera's +Z axis. */
export function yawToFace(lat: number, lon: number) {
  const [x, , z] = latLonToVector(lat, lon, 1);
  return Math.atan2(-x, z);
}

export function approachAngle(current: number, target: number) {
  const tau = Math.PI * 2;
  let delta = (target - current) % tau;
  if (delta > Math.PI) delta -= tau;
  if (delta < -Math.PI) delta += tau;
  return current + delta;
}

export function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const dest = approachAngle(current, target);
  const t = 1 - Math.exp(-lambda * dt);
  return current + (dest - current) * t;
}

export function levelForProgress(progress: number): ZoomLevel {
  if (progress < 0.2) return 0;
  if (progress < 0.46) return 1;
  if (progress < 0.72) return 2;
  return 3;
}

function satelliteFor(progress: number) {
  if (progress < 0.74) return 0;
  if (progress > 0.94) return 1;
  const t = (progress - 0.74) / 0.2;
  return t * t * (3 - 2 * t);
}

export function samplePath(
  progress: number,
  pathIds: readonly [string, string, string],
  locate: (id: string) => { lat: number; lon: number } | undefined,
): Sample {
  const p = clamp(progress, 0, 1);
  let index = 0;
  while (index < KEYS.length - 2 && p > KEYS[index + 1].p) index += 1;
  const from = KEYS[index];
  const to = KEYS[index + 1];
  const t = clamp((p - from.p) / Math.max(0.0001, to.p - from.p), 0, 1);
  const level = levelForProgress(p);
  const focusId = level === 0 ? null : pathIds[level - 1];
  const place = focusId ? locate(focusId) : undefined;
  return {
    distance: from.distance + (to.distance - from.distance) * t,
    pitch: from.pitch + (to.pitch - from.pitch) * t,
    satellite: satelliteFor(p),
    level,
    focusId,
    lat: place?.lat ?? 20,
    lon: place?.lon ?? 10,
  };
}

export function formatCoord(lat: number, lon: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

export function projectMercator(lat: number, lon: number, zoom: number) {
  const scale = 2 ** zoom;
  const x = ((lon + 180) / 360) * scale;
  const sine = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale;
  return { x, y };
}
