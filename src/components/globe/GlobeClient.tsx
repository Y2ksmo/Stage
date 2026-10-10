"use client";

import dynamic from "next/dynamic";

const GlobeExperience = dynamic(() => import("./GlobeExperience").then((mod) => mod.GlobeExperience), {
  ssr: false,
  loading: () => (
    <div className="globe-root">
      <div className="globe-boot">
        <p>Calibrating orbit</p>
      </div>
    </div>
  ),
});

export function GlobeClient() {
  return <GlobeExperience />;
}
