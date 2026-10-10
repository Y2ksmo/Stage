"use client";

import { Center, Text3D, useCursor } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FLOATING_LABELS } from "./geo";
import { globeStore, go } from "./store";

const FONT = "/fonts/helvetiker_regular.typeface.json";

function useGlowTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    if (!context) return texture;
    const gradient = context.createRadialGradient(128, 48, 8, 128, 48, 120);
    gradient.addColorStop(0, "rgba(150, 196, 255, 0.95)");
    gradient.addColorStop(0.45, "rgba(80, 140, 255, 0.28)");
    gradient.addColorStop(1, "rgba(80, 140, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 96);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function FloatingLabel({
  text,
  position,
  target,
  phase,
  width,
}: {
  text: string;
  position: [number, number, number];
  target: string;
  phase: number;
  width: number;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const hover = useRef(0);
  const [hot, setHot] = useState(false);
  const glowMap = useGlowTexture();
  useCursor(hot);

  useFrame(({ clock }, delta) => {
    const node = group.current;
    if (!node || !material.current || !glow.current) return;
    const step = Math.min(delta, 0.05);
    const fade = THREE.MathUtils.smoothstep(globeStore.rigDistance, 3.15, 4.15);
    node.visible = fade > 0.04;
    hover.current = THREE.MathUtils.damp(hover.current, hot ? 1 : 0, 5, step);
    const time = clock.elapsedTime;
    const lift = hover.current;
    node.position.set(
      position[0] + Math.sin(time * 0.42 + phase) * 0.045,
      position[1] + Math.sin(time * 0.78 + phase) * (0.07 + lift * 0.05),
      position[2],
    );
    node.rotation.y = Math.sin(time * 0.32 + phase) * 0.1 + lift * 0.42 + globeStore.pointer.x * 0.08;
    node.rotation.x = lift * -0.24 - globeStore.pointer.y * 0.05;
    node.rotation.z = Math.sin(time * 0.5 + phase) * 0.03 + globeStore.pointer.x * lift * 0.12;
    const scale = (0.92 + lift * 0.08) * fade;
    node.scale.setScalar(scale);
    material.current.opacity = fade;
    material.current.emissiveIntensity = 0.28 + lift * 1.55;
    glow.current.opacity = (0.18 + lift * 0.7) * fade;
  });

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        go(target);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHot(true);
      }}
      onPointerOut={() => setHot(false)}
    >
      <mesh position={[0, 0, -0.06]} scale={[width, 0.46, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={glow}
          map={glowMap}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          opacity={0.2}
        />
      </mesh>
      <Center>
        <Text3D
          font={FONT}
          size={0.046}
          height={0.012}
          lineHeight={0.85}
          curveSegments={4}
          bevelEnabled
          bevelThickness={0.004}
          bevelSize={0.0025}
          bevelSegments={2}
          letterSpacing={0.012}
        >
          {text}
          <meshStandardMaterial
            ref={material}
            color="#e7f1ff"
            emissive="#7eb6ff"
            emissiveIntensity={0.35}
            metalness={0.42}
            roughness={0.28}
            transparent
          />
        </Text3D>
      </Center>
    </group>
  );
}

export function FloatingText3D() {
  const { size } = useThree();
  const compact = size.width < 760;
  const labels = FLOATING_LABELS.filter((label) => (compact ? label.priority : true));
  const responsive = Math.min(1, size.width / 1180);

  return (
    <group scale={responsive}>
      {labels.map((label, index) => (
        <FloatingLabel
          key={label.id}
          text={label.text}
          position={label.position}
          target={label.target}
          phase={index * 1.3}
          width={Math.max(1.15, label.text.length * 0.105)}
        />
      ))}
    </group>
  );
}
