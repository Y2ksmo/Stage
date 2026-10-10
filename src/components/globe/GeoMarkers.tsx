"use client";

import { Html, useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { childrenOf, getPlace, pathSlot, type Place } from "./geo";
import { latLonToVector } from "./math";
import { go } from "./store";
import { useGlobeSnap } from "./useGlobeSnap";

const CONTINENTS = ["europe", "africa", "asia", "north-america", "south-america", "oceania"];

function calloutOffset(place: Place, level: number, index: number): [number, number] | null {
  if (level < 2 || !place.parentId) return null;
  const parent = getPlace(place.parentId);
  if (!parent) return null;
  const dLat = place.lat - parent.lat;
  const dLon = (place.lon - parent.lon) * Math.cos((parent.lat * Math.PI) / 180);
  const len = Math.hypot(dLat, dLon);
  const reach = 64;
  const spread = 54;
  const side = index % 2 === 0 ? 1 : -1;
  if (len < 0.08) return [side * spread, -reach];
  const ux = dLon / len;
  const uy = -dLat / len;
  return [ux * reach - uy * side * spread, uy * reach + ux * side * spread];
}

function MarkerLabel({
  place,
  featured,
  portal,
  fan,
  pinScale,
}: {
  place: Place;
  featured: boolean;
  portal: React.RefObject<HTMLDivElement | null>;
  fan: [number, number] | null;
  pinScale: number;
}) {
  const group = useRef<THREE.Group>(null);
  const pin = useRef<THREE.Mesh>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const cameraDir = useMemo(() => new THREE.Vector3(), []);
  const position = useMemo(() => latLonToVector(place.lat, place.lon, 1.018), [place.lat, place.lon]);
  const chip = useRef<HTMLButtonElement>(null);
  const [hot, setHot] = useState(false);
  useCursor(hot);

  useFrame(({ camera, clock }) => {
    const node = group.current;
    if (!node) return;
    node.getWorldPosition(world);
    world.normalize();
    cameraDir.copy(camera.position).normalize();
    const hidden = world.dot(cameraDir) < 0.2;
    const button = chip.current;
    if (button) {
      button.style.opacity = hidden ? "0" : "1";
      button.style.pointerEvents = hidden ? "none" : "auto";
    }
    if (pin.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.4 + place.lat) * (featured ? 0.28 : 0.12);
      pin.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh
        ref={pin}
        onClick={(event) => {
          event.stopPropagation();
          go(place.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHot(true);
        }}
        onPointerOut={() => setHot(false)}
      >
        <sphereGeometry args={[pinScale, 12, 12]} />
        <meshBasicMaterial color={hot || featured ? "#ffe1b0" : "#b7e3ff"} toneMapped={false} />
      </mesh>
      <Html portal={portal as React.RefObject<HTMLElement>} center position={[0, 0.03, 0]} zIndexRange={featured ? [40, 0] : [20, 0]} style={{ zIndex: featured ? 3 : 1 }}>
        <button
          ref={chip}
          type="button"
          className="geo-chip"
          data-hot={hot ? "true" : "false"}
          data-featured={featured ? "true" : "false"}
          data-fan={fan ? "true" : "false"}
          style={fan ? { transform: `translate(${fan[0]}px, ${fan[1] - 16}px)` } : undefined}
          onClick={(event) => {
            event.stopPropagation();
            go(place.id);
          }}
          onPointerOver={() => setHot(true)}
          onPointerOut={() => setHot(false)}
        >
          <i />
          {place.name}
        </button>
      </Html>
    </group>
  );
}

function CityLightField({ places }: { places: Place[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lights = useMemo(() => {
    const nodes: { lat: number; lon: number; phase: number }[] = [];
    places.forEach((place, index) => {
      for (let copy = 0; copy < 4; copy += 1) {
        const angle = (copy / 4) * Math.PI * 2 + index;
        const radius = 0.18 + (copy % 3) * 0.14;
        nodes.push({
          lat: place.lat + Math.sin(angle) * radius,
          lon: place.lon + Math.cos(angle) * radius * 1.35,
          phase: angle,
        });
      }
    });
    return nodes;
  }, [places]);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    lights.forEach((light, index) => {
      const [x, y, z] = latLonToVector(light.lat, light.lon, 1.008);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.01);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.count = lights.length;
    instanced.instanceMatrix.needsUpdate = true;
  }, [dummy, lights]);

  useFrame(({ clock }) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const time = clock.elapsedTime;
    lights.forEach((light, index) => {
      const [x, y, z] = latLonToVector(light.lat, light.lon, 1.008);
      const pulse = 0.65 + 0.55 * Math.sin(time * 2.1 + light.phase);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.0016 * pulse);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffc7a1", toneMapped: false }), []);

  return (
    <instancedMesh ref={mesh} args={[geometry, material, 64]} frustumCulled={false} />
  );
}

export function GeoMarkers({ portal }: { portal: React.RefObject<HTMLDivElement | null> }) {
  const snap = useGlobeSnap();
  const places = snap.level === 0
    ? CONTINENTS.map((id) => getPlace(id)).filter((place): place is Place => Boolean(place))
    : snap.level === 1
      ? childrenOf(pathSlot(snap.pathIds, 0))
      : snap.level === 2
        ? childrenOf(pathSlot(snap.pathIds, 1))
        : [];
  const featuredId = snap.level === 0 ? pathSlot(snap.pathIds, 0) : snap.level === 1 ? pathSlot(snap.pathIds, 1) : snap.level === 2 ? pathSlot(snap.pathIds, 2) : null;

  return (
    <group>
      {snap.level === 2 ? <CityLightField places={places} /> : null}
      {places.map((place, index) => (
        <MarkerLabel
          key={place.id}
          place={place}
          featured={place.id === featuredId}
          portal={portal}
          fan={calloutOffset(place, snap.level, index)}
          pinScale={snap.level >= 2 ? 0.0045 : featuredId === place.id ? 0.014 : 0.01}
        />
      ))}
    </group>
  );
}
