"use client";

import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const DAY = "/textures/earth_day.jpg";
const SPECULAR = "/textures/earth_specular.jpg";
const NORMAL = "/textures/earth_normal.jpg";
const NIGHT = "/textures/earth_lights.png";
const CLOUDS = "/textures/earth_clouds.png";

const nightVertex = `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const nightFragment = `
  uniform sampler2D nightMap;
  uniform vec3 lightDirection;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    float ndl = dot(normalize(vNormal), normalize(lightDirection));
    float night = smoothstep(0.18, -0.35, ndl);
    vec3 lights = texture2D(nightMap, vUv).rgb;
    vec3 glow = max(lights - vec3(0.045), 0.0);
    gl_FragColor = vec4(glow * night * 2.6, 1.0);
  }
`;

const atmosVertex = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosFragment = `
  varying vec3 vNormal;
  void main() {
    float fresnel = pow(0.62 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.8);
    gl_FragColor = vec4(vec3(0.38, 0.66, 1.0), clamp(fresnel, 0.0, 1.0));
  }
`;

export function EarthSphere() {
  const clouds = useRef<THREE.Mesh>(null);
  const [day, specular, normal, night, cloudMap] = useTexture([DAY, SPECULAR, NORMAL, NIGHT, CLOUDS]);
  const normalScale = useMemo(() => new THREE.Vector2(0.55, 0.55), []);
  const geometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(1, 96, 96);
    sphere.computeTangents();
    return sphere;
  }, []);

  useLayoutEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
    night.colorSpace = THREE.SRGBColorSpace;
    night.anisotropy = 8;
    specular.colorSpace = THREE.LinearSRGBColorSpace;
    normal.colorSpace = THREE.LinearSRGBColorSpace;
    cloudMap.colorSpace = THREE.LinearSRGBColorSpace;
  }, [cloudMap, day, night, normal, specular]);

  const nightMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          nightMap: { value: night },
          lightDirection: { value: new THREE.Vector3(5, 2.2, 3).normalize() },
        },
        vertexShader: nightVertex,
        fragmentShader: nightFragment,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [night],
  );

  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosVertex,
        fragmentShader: atmosFragment,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (clouds.current) clouds.current.rotation.y += Math.min(delta, 0.05) * 0.012;
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshPhongMaterial
          map={day}
          specularMap={specular}
          specular="#9ec9ff"
          shininess={18}
          normalMap={normal}
          normalScale={normalScale}
        />
      </mesh>
      <mesh geometry={geometry} scale={1.002} material={nightMaterial} />
      <mesh ref={clouds} scale={1.014}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          map={cloudMap}
          transparent
          opacity={0.26}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.08} material={atmosphere}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
    </group>
  );
}
