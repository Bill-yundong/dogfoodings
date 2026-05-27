import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import type { SwingPhase } from '@/types';

interface SwingTrajectory3DProps {
  clubHeadPath: [number, number, number][];
  cogPath: [number, number, number][];
  playbackFrame: number;
  phases?: SwingPhase[];
}

const COG_SCALE = 5;
const GLOW_COLOR = '#00F0B5';

function getPhaseAtFrame(frame: number, phases?: SwingPhase[]): SwingPhase['name'] | null {
  if (!phases) return null;
  for (const phase of phases) {
    if (frame >= phase.startFrame && frame <= phase.endFrame) {
      return phase.name;
    }
  }
  return null;
}

function getVertexColor(
  index: number,
  total: number,
  phaseName: SwingPhase['name'] | null
): THREE.Color {
  if (phaseName === 'impact') {
    return new THREE.Color('#FF2D55');
  }
  if (phaseName === 'downswing') {
    return new THREE.Color('#FF6B2B');
  }
  const t = total > 1 ? index / (total - 1) : 0;
  if (t < 0.5) {
    const s = t * 2;
    return new THREE.Color('#6366F1').lerp(new THREE.Color('#00F0B5'), s);
  }
  const s = (t - 0.5) * 2;
  return new THREE.Color('#00F0B5').lerp(new THREE.Color('#22D3EE'), s);
}

function ClubHeadTrajectory({
  path,
  playbackFrame,
  phases,
}: {
  path: [number, number, number][];
  playbackFrame: number;
  phases?: SwingPhase[];
}) {
  const pointRef = useRef<THREE.Mesh>(null);
  const clampedFrame = Math.min(playbackFrame, path.length - 1);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(path.length * 3);
    const col = new Float32Array(path.length * 3);
    for (let i = 0; i < path.length; i++) {
      pos[i * 3] = path[i][0];
      pos[i * 3 + 1] = path[i][1];
      pos[i * 3 + 2] = path[i][2];
      const phaseName = getPhaseAtFrame(i, phases);
      const color = getVertexColor(i, path.length, phaseName);
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    return { positions: pos, colors: col };
  }, [path, phases]);

  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, clampedFrame + 1);
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
    return new THREE.Line(geo, mat);
  }, [positions, colors, clampedFrame]);

  useFrame(() => {
    if (lineObj) {
      lineObj.geometry.setDrawRange(0, clampedFrame + 1);
    }
    if (pointRef.current && path.length > 0 && clampedFrame < path.length) {
      const p = path[clampedFrame];
      pointRef.current.position.set(p[0], p[1], p[2]);
    }
  });

  if (path.length === 0) return null;

  return (
    <group>
      <primitive object={lineObj} />
      {clampedFrame < path.length && (
        <mesh ref={pointRef} position={path[clampedFrame]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
}

function CogTrajectory({
  path,
  playbackFrame,
}: {
  path: [number, number, number][];
  playbackFrame: number;
}) {
  const pointRef = useRef<THREE.Mesh>(null);
  const clampedFrame = Math.min(playbackFrame, path.length - 1);

  const scaledPath = useMemo(
    () => path.map(([x, y, z]): [number, number, number] => [x * COG_SCALE, y * COG_SCALE, z * COG_SCALE]),
    [path]
  );

  const visiblePath = useMemo(
    () => scaledPath.slice(0, clampedFrame + 1),
    [scaledPath, clampedFrame]
  );

  useFrame(() => {
    if (pointRef.current && visiblePath.length > 0) {
      const p = visiblePath[visiblePath.length - 1];
      pointRef.current.position.set(p[0], p[1], p[2]);
    }
  });

  if (visiblePath.length < 2) return null;

  return (
    <group>
      <Line
        points={visiblePath}
        color={GLOW_COLOR}
        lineWidth={2}
      />
      <mesh ref={pointRef} position={visiblePath[visiblePath.length - 1]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={GLOW_COLOR} />
      </mesh>
    </group>
  );
}

function TrajectoryParticles({
  path,
  playbackFrame,
}: {
  path: [number, number, number][];
  playbackFrame: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particlePositions = useMemo(() => {
    const step = Math.max(1, Math.floor(path.length / 30));
    const result: [number, number, number][] = [];
    for (let i = 0; i < path.length && i <= playbackFrame; i += step) {
      result.push(path[i]);
    }
    return result;
  }, [path, playbackFrame]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < particlePositions.length; i++) {
      dummy.position.set(
        particlePositions[i][0],
        particlePositions[i][1] + Math.sin(t * 2 + i * 0.5) * 0.02,
        particlePositions[i][2]
      );
      const s = 0.5 + Math.sin(t * 3 + i) * 0.3;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (particlePositions.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particlePositions.length]}>
      <sphereGeometry args={[0.008, 8, 8]} />
      <meshBasicMaterial color="#88CCFF" transparent opacity={0.6} />
    </instancedMesh>
  );
}

function GroundGrid() {
  const gridSize = 10;
  const divisions = 20;
  return (
    <group position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <gridHelper args={[gridSize, divisions, '#222244', '#111133']} />
    </group>
  );
}

function Scene({
  clubHeadPath,
  cogPath,
  playbackFrame,
  phases,
}: SwingTrajectory3DProps) {
  return (
    <>
      <color attach="background" args={['#050510']} />
      <Stars count={2000} radius={50} depth={50} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <GroundGrid />
      <ClubHeadTrajectory path={clubHeadPath} playbackFrame={playbackFrame} phases={phases} />
      <CogTrajectory path={cogPath} playbackFrame={playbackFrame} />
      <TrajectoryParticles path={clubHeadPath} playbackFrame={playbackFrame} />
      <OrbitControls
        makeDefault
        target={[0, 1, 0]}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.1}
        maxDistance={12}
        minDistance={1}
      />
      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.2} luminanceSmoothing={0.9} />
      </EffectComposer>
    </>
  );
}

const SwingTrajectory3D = React.memo(function SwingTrajectory3D({
  clubHeadPath,
  cogPath,
  playbackFrame,
  phases,
}: SwingTrajectory3DProps) {
  return (
    <Canvas camera={{ position: [3, 2, 3], fov: 50 }} gl={{ antialias: true }}>
      <Scene
        clubHeadPath={clubHeadPath}
        cogPath={cogPath}
        playbackFrame={playbackFrame}
        phases={phases}
      />
    </Canvas>
  );
});

export default SwingTrajectory3D;
