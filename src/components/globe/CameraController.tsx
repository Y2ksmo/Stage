"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { getPlace, levelForKind, resolvePath } from "./geo";
import { dampAngle, LEVEL_PROGRESS, OPENING_YAW, prefersReducedMotion, samplePath, yawToFace } from "./math";
import { getSnap, globeStore, setSatellite, setView } from "./store";

gsap.registerPlugin(ScrollTrigger);

const UP = new THREE.Vector3(0, 1, 0);

type Goals = {
  distance: number;
  pitch: number;
  yaw: number;
  lat: number;
  lon: number;
  satellite: number;
};

export function CameraController({ earthRef }: { earthRef: React.RefObject<THREE.Group | null> }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const look = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());
  const goals = useRef<Goals>({ distance: 4.75, pitch: 0.18, yaw: OPENING_YAW, lat: 50.2, lon: 10.4, satellite: 0 });
  const displayLat = useRef(50.2);
  const desiredYaw = useRef(OPENING_YAW);
  const focusPoint = useRef(new THREE.Vector3());
  const north = useRef(new THREE.Vector3());
  const focusPos = useRef(new THREE.Vector3());
  const originPos = useRef(new THREE.Vector3());
  const lookFocus = useRef(new THREE.Vector3());
  const lookOrigin = useRef(new THREE.Vector3());
  const directed = useRef(false);
  const animating = useRef(false);
  const dragging = useRef(false);
  const allowOrbit = useRef(true);
  const timeline = useRef<gsap.core.Tween | null>(null);
  const [orbitOn, setOrbitOn] = useState(false);
  const orbitFlag = useRef(false);

  const setOrbit = (enabled: boolean) => {
    if (orbitFlag.current === enabled) return;
    orbitFlag.current = enabled;
    setOrbitOn(enabled);
  };

  useEffect(() => {
    const reduced = prefersReducedMotion();
    allowOrbit.current = !window.matchMedia("(pointer: coarse)").matches && !reduced;
    const root = document.querySelector<HTMLElement>("[data-globe-scroll]");
    if (!root) return;

    const scrollMax = () => Math.max(1, root.offsetHeight - window.innerHeight);

    const publish = (progress: number) => {
      const path = getSnap().pathIds;
      const sampled = samplePath(progress, path, (id) => getPlace(id));
      goals.current.distance = sampled.distance;
      goals.current.pitch = sampled.pitch;
      goals.current.satellite = sampled.satellite;
      const aim = getPlace(sampled.focusId ?? path[0]);
      if (aim) {
        goals.current.lat = aim.lat;
        goals.current.lon = aim.lon;
      }
      const idleOrbit = progress < 0.045 && !animating.current && allowOrbit.current;
      const nextDirected = !idleOrbit;
      if (nextDirected && !directed.current) desiredYaw.current = goals.current.yaw;
      if (sampled.level > 0) desiredYaw.current = yawToFace(sampled.lat, sampled.lon);
      directed.current = nextDirected;
      setOrbit(idleOrbit);
      setSatellite(sampled.satellite);
      globeStore.rigDistance = sampled.distance;
      setView({
        level: sampled.level,
        focusId: sampled.focusId,
        animating: animating.current,
        ...(animating.current ? {} : { targetId: null }),
      });
    };

    const flyTo = (progress: number) => {
      const max = scrollMax();
      const from = window.scrollY / max;
      timeline.current?.kill();
      animating.current = true;
      directed.current = true;
      setOrbit(false);
      if (reduced || Math.abs(progress - from) < 0.004) {
        window.scrollTo(0, progress * max);
        animating.current = false;
        publish(progress);
        return;
      }
      const proxy = { p: from };
      timeline.current = gsap.to(proxy, {
        p: progress,
        duration: 1.2 + Math.abs(progress - from) * 1.65,
        ease: "power3.inOut",
        onUpdate: () => {
          window.scrollTo(0, proxy.p * max);
          publish(proxy.p);
        },
        onComplete: () => {
          animating.current = false;
          timeline.current = null;
          publish(proxy.p);
        },
      });
    };

    globeStore.navigate = (id) => {
      if (id === null) {
        setView({ targetId: null, animating: true });
        flyTo(LEVEL_PROGRESS[0]);
        return;
      }
      const place = getPlace(id);
      if (!place) return;
      const pathIds = resolvePath(id);
      setView({ pathIds, targetId: id, animating: true });
      flyTo(LEVEL_PROGRESS[levelForKind(place.kind)]);
    };

    const stopFly = () => {
      if (!timeline.current) return;
      timeline.current.kill();
      timeline.current = null;
      animating.current = false;
      publish(window.scrollY / scrollMax());
    };

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? 0.01 : 0.85,
        onUpdate: (self) => {
          if (animating.current) return;
          publish(self.progress);
        },
      });
    });

    publish(window.scrollY / scrollMax());
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", stopFly, { passive: true });
    window.addEventListener("touchmove", stopFly, { passive: true });

    const element = gl.domElement;
    if (!allowOrbit.current) element.style.touchAction = "pan-y";

    return () => {
      timeline.current?.kill();
      globeStore.navigate = null;
      context.revert();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", stopFly);
      window.removeEventListener("touchmove", stopFly);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);
    const earth = earthRef.current;
    globeStore.rigDistance = camera.position.length();

    const distance = camera.position.length();
    const ratio = distance > 3.1 ? 1 : 1.5;
    const nextRatio = Math.min(ratio, window.devicePixelRatio || 1);
    if (Math.abs(gl.getPixelRatio() - nextRatio) > 0.05) gl.setPixelRatio(nextRatio);

    if (!directed.current) {
      if (!dragging.current && !prefersReducedMotion()) goals.current.yaw += step * 0.07;
      if (earth) earth.rotation.y = goals.current.yaw;
      return;
    }

    goals.current.yaw = dampAngle(goals.current.yaw, desiredYaw.current, 2.6, step);
    if (earth) earth.rotation.y = goals.current.yaw;
    displayLat.current += (goals.current.lat - displayLat.current) * (1 - Math.exp(-3.2 * step));

    const { distance: radius, pitch, lon } = goals.current;
    const lat = displayLat.current;
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    focusPoint.current.set(-cosTheta * sinPhi, cosPhi, sinTheta * sinPhi);
    north.current.set(cosTheta * cosPhi, sinPhi, -sinTheta * cosPhi).normalize();
    focusPoint.current.applyAxisAngle(UP, goals.current.yaw);
    north.current.applyAxisAngle(UP, goals.current.yaw);

    const altitude = Math.max(0.12, radius - 1);
    const tilt = Math.sin(Math.min(pitch, 1.05)) * altitude * 0.72;
    focusPos.current.copy(focusPoint.current).multiplyScalar(radius).addScaledVector(north.current, -tilt);
    originPos.current.set(0, Math.sin(pitch) * radius, Math.cos(pitch) * radius);
    const weight = 1 - THREE.MathUtils.smoothstep(radius, 2.4, 3.4);
    targetPos.current.lerpVectors(originPos.current, focusPos.current, weight);

    lookFocus.current.copy(focusPoint.current).multiplyScalar(0.96);
    const pull = THREE.MathUtils.clamp((4.75 - radius) / 3.4, 0, 1);
    lookOrigin.current.set(0, Math.sin(pitch) * pull * 0.28, pull * 0.78);
    look.current.lerpVectors(lookOrigin.current, lookFocus.current, weight);

    const gap = camera.position.distanceTo(targetPos.current);
    if (gap > 0.08) camera.position.lerp(targetPos.current, 1 - Math.exp(-5.5 * step));
    else camera.position.copy(targetPos.current);
    camera.lookAt(look.current);
    if (controls.current) controls.current.target.copy(look.current);
    setSatellite(goals.current.satellite);
  });

  return (
    <OrbitControls
      ref={controls}
      enabled={orbitOn}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      enableZoom={false}
      minDistance={3.15}
      maxDistance={8}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI - 0.35}
      rotateSpeed={0.42}
      onStart={() => {
        dragging.current = true;
      }}
      onEnd={() => {
        dragging.current = false;
      }}
    />
  );
}
