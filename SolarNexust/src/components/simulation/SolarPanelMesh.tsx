import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SolarPanel } from '@/types/solar';
import type { RayTracingResult, PowerGeneration } from '@/types/solar';

interface SolarPanelMeshProps {
  panel: SolarPanel;
  rayResult?: RayTracingResult;
  generation?: PowerGeneration;
  isSelected: boolean;
  onClick: () => void;
}

export function SolarPanelMesh({
  panel,
  rayResult,
  generation,
  isSelected,
  onClick,
}: SolarPanelMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef<THREE.Mesh>(null);
  
  const shadowCoverage = rayResult?.shadowCoverage ?? 0;
  const efficiency = generation ? 1 - generation.lossRate : 1;
  
  const panelColor = useMemo(() => {
    if (panel.status === 'fault') {
      return new THREE.Color('#FF3B30');
    }
    if (panel.status === 'degraded') {
      return new THREE.Color('#FF9500');
    }
    
    const baseColor = new THREE.Color('#1a1a2e');
    const shadowColor = new THREE.Color('#0a0a15');
    const shadowFactor = shadowCoverage;
    
    return baseColor.clone().lerp(shadowColor, shadowFactor * 0.7);
  }, [panel.status, shadowCoverage]);
  
  const emissiveIntensity = useMemo(() => {
    if (isSelected) return 0.5;
    return efficiency > 0.8 ? 0.1 : 0;
  }, [isSelected, efficiency]);
  
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.5;
      meshRef.current.material.emissiveIntensity = pulse;
    }
  });
  
  return (
    <group position={[panel.position.x, panel.position.y, panel.position.z]}>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <planeGeometry args={[2, 1]} />
        <meshStandardMaterial
          color={panelColor}
          emissive={isSelected ? '#64FFDA' : '#000000'}
          emissiveIntensity={emissiveIntensity}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      <mesh ref={frameRef} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 1.2]} />
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#4a4a5e" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0.8, -0.3, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#4a4a5e" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[-0.8, -0.3, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#4a4a5e" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}
