"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { globeStore } from "./store";

const FAR_COUNT = 1600;
const NEAR_COUNT = 700;
const BRIGHT_COUNT = 80;

function shell(count: number, minRadius: number, maxRadius: number) {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index * 3 + 2] = radius * Math.cos(phi);
    phases[index] = Math.random() * Math.PI * 2;
  }
  return { positions, phases };
}

const starVertex = `
  attribute float phase;
  uniform float uTime;
  varying float vTwinkle;
  void main() {
    vTwinkle = 0.55 + 0.45 * sin(uTime * 1.4 + phase);
    vec4 view = viewMatrix * modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = (2.2 + 2.4 * vTwinkle) * (18.0 / max(1.0, -view.z));
  }
`;

const starFragment = `
  varying float vTwinkle;
  void main() {
    vec2 delta = gl_PointCoord - vec2(0.5);
    float falloff = smoothstep(0.5, 0.08, length(delta));
    vec3 color = mix(vec3(0.72, 0.8, 1.0), vec3(1.0, 0.96, 0.9), vTwinkle);
    gl_FragColor = vec4(color, falloff * vTwinkle);
  }
`;

function StarPoints({ minRadius, maxRadius, count, parallax }: { minRadius: number; maxRadius: number; count: number; parallax: number }) {
  const ref = useRef<THREE.Points>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: starVertex,
        fragmentShader: starFragment,
      }),
    [],
  );
  const geometry = useMemo(() => {
    const data = shell(count, minRadius, maxRadius);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("phase", new THREE.BufferAttribute(data.phases, 1));
    return geo;
  }, [count, maxRadius, minRadius]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    const points = ref.current;
    if (!points) return;
    const targetX = globeStore.pointer.x * parallax;
    const targetY = globeStore.pointer.y * parallax * 0.65;
    points.position.x += (targetX - points.position.x) * 0.04;
    points.position.y += (targetY - points.position.y) * 0.04;
    points.rotation.y = clock.elapsedTime * 0.004;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}

function BrightStars() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const bases = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index < BRIGHT_COUNT; index += 1) {
      const radius = 10 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      points.push(new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      ));
    }
    return points;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const glow = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return new THREE.CanvasTexture(canvas);
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(186,214,255,0.8)");
    gradient.addColorStop(1, "rgba(186,214,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    bases.forEach((point, index) => {
      dummy.position.copy(point);
      dummy.scale.setScalar(0.18 + (index % 5) * 0.05);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  }, [bases, dummy]);

  useFrame(({ camera, clock }) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const drift = clock.elapsedTime * 0.012;
    bases.forEach((point, index) => {
      dummy.position.copy(point);
      dummy.position.x += globeStore.pointer.x * -0.35;
      dummy.position.y += globeStore.pointer.y * -0.2;
      dummy.quaternion.copy(camera.quaternion);
      const pulse = 0.16 + (index % 4) * 0.04 + Math.sin(drift + index) * 0.03;
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [glow],
  );

  return <instancedMesh ref={mesh} args={[geometry, material, BRIGHT_COUNT]} frustumCulled={false} />;
}

export function Starfield() {
  return (
    <group>
      <StarPoints count={FAR_COUNT} minRadius={22} maxRadius={42} parallax={-0.18} />
      <StarPoints count={NEAR_COUNT} minRadius={9} maxRadius={16} parallax={-0.55} />
      <BrightStars />
    </group>
  );
}
