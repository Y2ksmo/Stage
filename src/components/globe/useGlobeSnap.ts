"use client";

import { useSyncExternalStore } from "react";
import { getSnap, subscribe } from "./store";

export function useGlobeSnap() {
  return useSyncExternalStore(subscribe, getSnap, getSnap);
}
