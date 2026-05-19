'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface WorkspaceProps {
  size?: [number, number, number];
}

export const Workspace = ({ size = [6, 0.02, 4] }: WorkspaceProps) => {
  const gridHelper = useMemo(() => {
    return new THREE.GridHelper(size[0], 20, '#1e3a5f', '#1a2c42');
  }, [size]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size[0], size[2]]} />
        <meshStandardMaterial
          color="#0d1117"
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      <primitive object={gridHelper} position={[0, 0.01, 0]} />

      <mesh position={[0, size[1] / 2, size[2] / 2]}>
        <boxGeometry args={[size[0], size[1], 0.05]} />
        <meshStandardMaterial color="#161b22" metalness={0.3} roughness={0.7} />
      </mesh>

      <mesh position={[0, size[1] / 2, -size[2] / 2]}>
        <boxGeometry args={[size[0], size[1], 0.05]} />
        <meshStandardMaterial color="#161b22" metalness={0.3} roughness={0.7} />
      </mesh>

      <mesh position={[size[0] / 2, size[1] / 2, 0]}>
        <boxGeometry args={[0.05, size[1], size[2]]} />
        <meshStandardMaterial color="#161b22" metalness={0.3} roughness={0.7} />
      </mesh>

      <mesh position={[-size[0] / 2, size[1] / 2, 0]}>
        <boxGeometry args={[0.05, size[1], size[2]]} />
        <meshStandardMaterial color="#161b22" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
};
