"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CameraController } from "./CameraController";
import { OPENING_YAW } from "./math";
import { EarthSphere } from "./EarthSphere";
import { FloatingText3D } from "./FloatingText3D";
import { GeoMarkers } from "./GeoMarkers";
import { Starfield } from "./Starfield";

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.05} />
      <hemisphereLight args={["#d5e7ff", "#07060c", 0.28]} />
      <directionalLight position={[5, 2.2, 3]} intensity={2.8} color="#fff3e2" />
      <directionalLight position={[-4, -1.2, -2]} intensity={0.18} color="#1d3d6e" />
    </>
  );
}

function EarthFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 48, 48]} />
      <meshStandardMaterial color="#1d4e89" roughness={0.7} />
    </mesh>
  );
}

export function SpaceScene() {
  const earthRef = useRef<THREE.Group>(null);
  const portal = useRef<HTMLDivElement>(null);
  const [labelsReady, setLabelsReady] = useState(false);

  useEffect(() => {
    setLabelsReady(true);
  }, []);

  return (
    <>
      <div ref={portal} className="globe-label-layer" />
      <Canvas
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.85, 4.67], fov: 42, near: 0.05, far: 120 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor("#02030a");
      }}
    >
      <SceneLights />
      <Starfield />
      <group ref={earthRef} rotation={[0, OPENING_YAW, 0]}>
        <Suspense fallback={<EarthFallback />}>
          <EarthSphere />
        </Suspense>
        {labelsReady ? <GeoMarkers portal={portal} /> : null}
      </group>
      <Suspense fallback={null}>
        <FloatingText3D />
      </Suspense>
      <CameraController earthRef={earthRef} />
    </Canvas>
    </>
  );
}
