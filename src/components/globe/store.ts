export type ZoomLevel = 0 | 1 | 2 | 3;

export type ViewSnap = {
  level: ZoomLevel;
  focusId: string | null;
  pathIds: [string, string, string];
  animating: boolean;
  targetId: string | null;
};

export type NavigateFn = (id: string | null) => void;

const listeners = new Set<() => void>();
const satelliteListeners = new Set<(value: number) => void>();

let snap: ViewSnap = {
  level: 0,
  focusId: null,
  pathIds: ["europe", "netherlands", "lelystad"],
  animating: false,
  targetId: null,
};

export const globeStore = {
  rigDistance: 4.75,
  satellite: 0,
  pointer: { x: 0, y: 0 },
  navigate: null as NavigateFn | null,
};

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnap() {
  return snap;
}

export function setView(partial: Partial<ViewSnap>) {
  const next: ViewSnap = { ...snap, ...partial };
  if (
    next.level === snap.level &&
    next.focusId === snap.focusId &&
    next.animating === snap.animating &&
    next.targetId === snap.targetId &&
    next.pathIds[0] === snap.pathIds[0] &&
    next.pathIds[1] === snap.pathIds[1] &&
    next.pathIds[2] === snap.pathIds[2]
  ) {
    return;
  }
  snap = next;
  listeners.forEach((listener) => listener());
}

export function onSatellite(listener: (value: number) => void) {
  satelliteListeners.add(listener);
  return () => {
    satelliteListeners.delete(listener);
  };
}

export function setSatellite(value: number) {
  if (Math.abs(globeStore.satellite - value) < 0.01) return;
  globeStore.satellite = value;
  satelliteListeners.forEach((listener) => listener(value));
}

export function go(id: string | null) {
  globeStore.navigate?.(id);
}
