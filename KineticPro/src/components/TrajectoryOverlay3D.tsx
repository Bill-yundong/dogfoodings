import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { SwingTrajectory } from '@/types';

interface TrajectoryOverlay3DProps {
  trajectories: SwingTrajectory[];
  colors: string[];
}

const TRAJECTORY_COLORS = ['#6366F1', '#00F0B5', '#FF6B2B', '#FFD60A'];

function TrajectoryLine({ path, color }: { path: [number, number, number][]; color: string }) {
  return (
    <Line
      points={path}
      color={color}
      lineWidth={2.5}
      transparent
      opacity={0.7}
    />
  );
}

function DiffMarkers({ paths, colors }: { paths: [number, number, number][][]; colors: string[] }) {
  const markersRef = useRef<THREE.InstancedMesh>(null);

  const count = useMemo(() => {
    if (paths.length < 2) return 0;
    const len = Math.min(...paths.map(p => p.length));
    let c = 0;
    for (let i = 0; i < len; i += 5) {
      const p0 = paths[0][i];
      const p1 = paths[1][i];
      const dist = Math.sqrt(
        (p0[0] - p1[0]) ** 2 + (p0[1] - p1[1]) ** 2 + (p0[2] - p1[2]) ** 2
      );
      if (dist > 0.1) c++;
    }
    return c;
  }, [paths]);

  useFrame(() => {
    if (!markersRef.current || count === 0) return;
    const mesh = markersRef.current;
    const dummy = new THREE.Object3D();
    let idx = 0;
    const len = Math.min(...paths.map(p => p.length));
    for (let i = 0; i < len && idx < count; i += 5) {
      const p0 = paths[0][i];
      const p1 = paths[1][i];
      const dist = Math.sqrt(
        (p0[0] - p1[0]) ** 2 + (p0[1] - p1[1]) ** 2 + (p0[2] - p1[2]) ** 2
      );
      if (dist > 0.1) {
        const mid = [
          (p0[0] + p1[0]) / 2,
          (p0[1] + p1[1]) / 2,
          (p0[2] + p1[2]) / 2,
        ] as [number, number, number];
        dummy.position.set(...mid);
        dummy.scale.setScalar(Math.min(dist * 0.5, 0.08));
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={markersRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color="#FF6B2B" transparent opacity={0.8} />
    </instancedMesh>
  );
}

function Scene({ trajectories, colors }: TrajectoryOverlay3DProps) {
  const allPaths = trajectories.map(t => t.clubHeadPath);
  const usedColors = colors.length >= trajectories.length
    ? colors
    : trajectories.map((_, i) => TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length]);

  return (
    <>
      <color attach="background" args={['#050510']} />
      <Stars count={1500} factor={3} fade speed={0.5} />
      <ambientLight intensity={0.4} />
      <pointLight position={[2, 3, 2]} intensity={0.8} color="#00F0B5" />

      <gridHelper args={[10, 20, '#1A1F2E', '#1A1F2E']} position={[0, 0, 0]} />

      {allPaths.map((path, i) => (
        <TrajectoryLine key={i} path={path} color={usedColors[i]} />
      ))}

      {allPaths.length >= 2 && <DiffMarkers paths={allPaths} colors={usedColors} />}

      <OrbitControls
        minDistance={1}
        maxDistance={10}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2}
        target={[0, 1, 0]}
      />

      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.2} luminanceSmoothing={0.9} />
      </EffectComposer>
    </>
  );
}

export default function TrajectoryOverlay3D({ trajectories, colors }: TrajectoryOverlay3DProps) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-[#2A2F3E]">
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <Scene trajectories={trajectories} colors={colors} />
      </Canvas>
    </div>
  );
}
