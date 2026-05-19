'use client';

import type { Obstacle as ObstacleType } from '@/types/robot';

interface ObstacleProps {
  obstacle: ObstacleType;
}

export const Obstacle = ({ obstacle }: ObstacleProps) => {
  const { type, position, size, color } = obstacle;

  const renderGeometry = () => {
    switch (type) {
      case 'box':
        return <boxGeometry args={size} />;
      case 'sphere':
        return <sphereGeometry args={[size[0] / 2, 32, 32]} />;
      case 'cylinder':
        return <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 32]} />;
      default:
        return <boxGeometry args={size} />;
    }
  };

  return (
    <mesh position={position} castShadow receiveShadow>
      {renderGeometry()}
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.7}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};
