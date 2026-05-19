'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RobotModel, RobotPose } from '@/types/robot';
import { forwardKinematics } from '@/lib/robotics/kinematics';

interface RobotArmProps {
  model: RobotModel;
  pose: RobotPose;
  isSelected?: boolean;
}

export const RobotArm = ({ model, pose, isSelected = false }: RobotArmProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const linkRefs = useRef<(THREE.Mesh | null)[]>([]);

  const linkTransforms = useMemo(() => {
    return forwardKinematics(model.dhParameters, pose.joints, model.basePosition);
  }, [model.dhParameters, pose.joints, model.basePosition]);

  useFrame(() => {
    if (!groupRef.current) return;

    for (let i = 0; i < linkRefs.current.length; i++) {
      const link = linkRefs.current[i];
      if (!link || i >= linkTransforms.linkTransforms.length - 1) continue;

      const transform = linkTransforms.linkTransforms[i + 1];
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      transform.decompose(position, quaternion, new THREE.Vector3());

      link.position.copy(position);
      link.quaternion.copy(quaternion);
    }
  });

  const baseColor = isSelected ? new THREE.Color(model.color).multiplyScalar(1.5) : new THREE.Color(model.color);

  return (
    <group ref={groupRef}>
      <mesh position={model.basePosition}>
        <cylinderGeometry args={[0.15, 0.18, 0.05, 32]} />
        <meshStandardMaterial color={baseColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {model.linkDimensions.map((dim, i) => {
        const isLastLink = i === model.linkDimensions.length - 1;
        const linkColor = isLastLink ? '#ff6b6b' : model.color;
        const emissive = isSelected && isLastLink ? model.color : '#000000';

        return (
          <mesh
            key={i}
            ref={el => { linkRefs.current[i] = el; }}
          >
            <cylinderGeometry args={[dim.radius, dim.radius * 0.9, dim.length, 16]} />
            <meshStandardMaterial
              color={linkColor}
              metalness={0.6}
              roughness={0.25}
              emissive={emissive}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
        );
      })}

      <mesh ref={el => { linkRefs.current[model.linkDimensions.length] = el; }}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={model.color}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
        />
      </mesh>

      {isSelected && (
        <mesh position={linkTransforms.position}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={model.color} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};
