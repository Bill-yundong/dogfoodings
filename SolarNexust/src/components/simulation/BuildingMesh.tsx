import { useMemo } from 'react';
import * as THREE from 'three';
import type { Building } from '@/types/solar';

interface BuildingMeshProps {
  building: Building;
}

export function BuildingMesh({ building }: BuildingMeshProps) {
  const { geometry, height } = useMemo(() => {
    const { vertices, height: h } = building;
    
    const shape = new THREE.Shape();
    if (vertices.length >= 3) {
      shape.moveTo(vertices[0].x, vertices[0].z);
      for (let i = 1; i < vertices.length; i++) {
        shape.lineTo(vertices[i].x, vertices[i].z);
      }
      shape.closePath();
    }
    
    const extrudeSettings = {
      depth: h,
      bevelEnabled: false,
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(Math.PI / 2);
    
    return { geometry, height: h };
  }, [building]);
  
  const color = useMemo(() => {
    switch (building.type) {
      case 'residential':
        return '#8B7355';
      case 'commercial':
        return '#4A5568';
      case 'industrial':
        return '#2D3748';
      default:
        return '#4A5568';
    }
  }, [building.type]);
  
  return (
    <mesh geometry={geometry} position={[0, 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        metalness={0.1}
        roughness={0.9}
      />
      <mesh position={[0, height + 0.1, 0]}>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial
          color="#1A202C"
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
    </mesh>
  );
}
