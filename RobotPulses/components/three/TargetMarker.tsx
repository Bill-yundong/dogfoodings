'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TargetMarkerProps {
  position: [number, number, number];
  color: string;
}

export const TargetMarker = ({ position, color }: TargetMarkerProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.08, 0.01, 16, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.12, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
