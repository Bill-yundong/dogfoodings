import { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Debris, ConjunctionEvent } from "@/types/orbital";
import { propagateAnalytical, elementsToState } from "@/orbital/twobody";
import { EARTH_RADIUS_KM } from "@/utils/constants";
import { useOrbitStore } from "@/store/orbit";

const SCALE = 1 / 2000;
const DISPLAY_RADIUS = EARTH_RADIUS_KM * SCALE;

function orbitVertices(el: Debris["elements"], segments = 256): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const nu = (i / segments) * 360;
    const sv = elementsToState({ ...el, trueAnomalyDeg: nu });
    pts.push([
      sv.positionKm[0] * SCALE,
      sv.positionKm[2] * SCALE,
      -sv.positionKm[1] * SCALE,
    ]);
  }
  return pts;
}

function Earth() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, "#0b2545");
    grad.addColorStop(0.5, "#1e4d7a");
    grad.addColorStop(1, "#0a1a2f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(56,189,248,${Math.random() * 0.15})`;
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const w = 20 + Math.random() * 80;
      const h = 5 + Math.random() * 20;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }, []);

  return (
    <mesh>
      <sphereGeometry args={[DISPLAY_RADIUS, 64, 64]} />
      <meshBasicMaterial map={texture} transparent opacity={0.95} />
    </mesh>
  );
}

function OrbitRing({
  el,
  color,
  highlighted,
}: {
  el: Debris["elements"];
  color: string;
  highlighted?: boolean;
}) {
  const points = useMemo(() => orbitVertices(el), [el]);
  return (
    <Line
      points={points}
      color={color}
      lineWidth={highlighted ? 2 : 0.6}
      transparent
      opacity={highlighted ? 0.9 : 0.35}
    />
  );
}

function BodyMarker({
  debris,
  jd,
  color,
  label,
  size,
  pulse,
}: {
  debris: Debris;
  jd: number;
  color: string;
  label?: string;
  size?: number;
  pulse?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const dt = (jd - debris.epochJd) * 86400;
    const sv = propagateAnalytical(debris.elements, dt, { j2: true });
    groupRef.current.position.set(
      sv.positionKm[0] * SCALE,
      sv.positionKm[2] * SCALE,
      -sv.positionKm[1] * SCALE
    );
  });
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[size ?? 0.15, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {pulse && (
        <mesh>
          <sphereGeometry args={[(size ?? 0.15) * 2.5, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.25}
          />
        </mesh>
      )}
      {label && (
        <Html distanceFactor={20} zIndexRange={[0, 0]} position={[0, 0.35, 0]}>
          <div className="px-1.5 py-0.5 text-[10px] rounded border border-cyan-400/40 bg-black/70 text-cyan-200 hud-text whitespace-nowrap pointer-events-none">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

function CameraAnchor({ jd, target }: { jd: number; target: Debris }) {
  const { camera } = useThree();
  const init = useRef(false);
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    camera.position.set(0, DISPLAY_RADIUS * 6, DISPLAY_RADIUS * 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  void jd;
  void target;
  return null;
}

export default function SpaceView() {
  const target = useOrbitStore((s) => s.target);
  const debris = useOrbitStore((s) => s.debris);
  const events = useOrbitStore((s) => s.events);
  const currentJd = useOrbitStore((s) => s.currentJd);
  const selectedId = useOrbitStore((s) => s.selectedEventId);

  const visibleDebris = useMemo(() => {
    const selectedEvent = events.find((e) => e.id === selectedId);
    if (selectedEvent) {
      const selNorad = selectedEvent.debrisNorad;
      return debris
        .filter((d) => d.orbitClass === "LEO" || d.noradId === selNorad)
        .slice(0, 80);
    }
    return debris.filter((d) => d.orbitClass === "LEO").slice(0, 80);
  }, [debris, events, selectedId]);

  const selectedEvent = events.find((e) => e.id === selectedId);

  return (
    <Canvas
      camera={{ fov: 50, near: 0.01, far: 10000, position: [0, DISPLAY_RADIUS * 6, DISPLAY_RADIUS * 10] }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#05070d"]} />
      <ambientLight intensity={0.6} />
      <Stars radius={300} depth={60} count={4000} factor={4} fade speed={0.4} />
      <CameraAnchor jd={currentJd} target={target} />
      <Earth />
      <OrbitRing el={target.elements} color={target.color ?? "#22d3ee"} highlighted />
      {visibleDebris.map((d) => (
        <OrbitRing
          key={d.noradId}
          el={d.elements}
          color={d.color ?? "#38bdf8"}
          highlighted={selectedEvent?.debrisNorad === d.noradId}
        />
      ))}
      <BodyMarker
        debris={target}
        jd={currentJd}
        color={target.color ?? "#22d3ee"}
        label={target.name}
        size={0.22}
        pulse
      />
      {visibleDebris.map((d) => (
        <BodyMarker
          key={d.noradId}
          debris={d}
          jd={currentJd}
          color={selectedEvent?.debrisNorad === d.noradId ? "#ef4444" : (d.color ?? "#38bdf8")}
          size={selectedEvent?.debrisNorad === d.noradId ? 0.22 : 0.08}
          pulse={selectedEvent?.debrisNorad === d.noradId}
        />
      ))}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={DISPLAY_RADIUS * 1.5}
        maxDistance={DISPLAY_RADIUS * 40}
      />
    </Canvas>
  );
}
