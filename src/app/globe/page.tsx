import type { Metadata } from "next";
import { GlobeClient } from "../../components/globe/GlobeClient";
import "./globe.css";

export const metadata: Metadata = {
  title: "Global Infrastructure",
  description: "Orbital Earth scene with continent, country, and town camera choreography.",
};

export default function GlobePage() {
  return <GlobeClient />;
}
