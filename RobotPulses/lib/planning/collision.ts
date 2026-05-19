import * as THREE from 'three';
import type { Obstacle, RobotModel, CollisionWarning } from '@/types/robot';

export interface AABB {
  min: [number, number, number];
  max: [number, number, number];
}

export interface OBB {
  center: [number, number, number];
  axes: [[number, number, number], [number, number, number], [number, number, number]];
  halfExtents: [number, number, number];
}

export const createAABBFromObstacle = (obstacle: Obstacle): AABB => {
  const { position, size } = obstacle;
  const halfSize = [size[0] / 2, size[1] / 2, size[2] / 2];
  return {
    min: [position[0] - halfSize[0], position[1] - halfSize[1], position[2] - halfSize[2]],
    max: [position[0] + halfSize[0], position[1] + halfSize[1], position[2] + halfSize[2]],
  };
};

export const createOBBFromLink = (
  transform: THREE.Matrix4,
  dimensions: { length: number; radius: number }
): OBB => {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  transform.decompose(position, quaternion, scale);

  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
  const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);

  return {
    center: [position.x, position.y, position.z],
    axes: [
      [xAxis.x, xAxis.y, xAxis.z],
      [yAxis.x, yAxis.y, yAxis.z],
      [zAxis.x, zAxis.y, zAxis.z],
    ],
    halfExtents: [dimensions.radius, dimensions.length / 2, dimensions.radius],
  };
};

export const checkAABBIntersection = (a: AABB, b: AABB): boolean => {
  return (
    a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
    a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
    a.min[2] <= b.max[2] && a.max[2] >= b.min[2]
  );
};

export const checkOBBIntersection = (a: OBB, b: OBB): boolean => {
  const axes: Array<[number, number, number]> = [
    a.axes[0], a.axes[1], a.axes[2],
    b.axes[0], b.axes[1], b.axes[2],
  ];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const cross: [number, number, number] = [
        a.axes[i][1] * b.axes[j][2] - a.axes[i][2] * b.axes[j][1],
        a.axes[i][2] * b.axes[j][0] - a.axes[i][0] * b.axes[j][2],
        a.axes[i][0] * b.axes[j][1] - a.axes[i][1] * b.axes[j][0],
      ];
      const norm = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
      if (norm > 1e-6) {
        axes.push([cross[0] / norm, cross[1] / norm, cross[2] / norm]);
      }
    }
  }

  const centerDelta: [number, number, number] = [
    b.center[0] - a.center[0],
    b.center[1] - a.center[1],
    b.center[2] - a.center[2],
  ];

  for (const axis of axes) {
    const projectionA = projectOBB(a, axis);
    const projectionB = projectOBB(b, axis);
    const centerProjection = centerDelta[0] * axis[0] + centerDelta[1] * axis[1] + centerDelta[2] * axis[2];

    if (Math.abs(centerProjection) > projectionA + projectionB) {
      return false;
    }
  }

  return true;
};

const projectOBB = (obb: OBB, axis: [number, number, number]): number => {
  let projection = 0;
  for (let i = 0; i < 3; i++) {
    projection += obb.halfExtents[i] * Math.abs(
      obb.axes[i][0] * axis[0] + obb.axes[i][1] * axis[1] + obb.axes[i][2] * axis[2]
    );
  }
  return projection;
};

export const computeDistanceToObstacle = (
  position: [number, number, number],
  obstacle: Obstacle
): number => {
  const { type, position: obsPos, size } = obstacle;

  switch (type) {
    case 'box': {
      const halfSize = [size[0] / 2, size[1] / 2, size[2] / 2];
      const closest: [number, number, number] = [
        Math.max(obsPos[0] - halfSize[0], Math.min(obsPos[0] + halfSize[0], position[0])),
        Math.max(obsPos[1] - halfSize[1], Math.min(obsPos[1] + halfSize[1], position[1])),
        Math.max(obsPos[2] - halfSize[2], Math.min(obsPos[2] + halfSize[2], position[2])),
      ];
      const dx = position[0] - closest[0];
      const dy = position[1] - closest[1];
      const dz = position[2] - closest[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    case 'sphere': {
      const dx = position[0] - obsPos[0];
      const dy = position[1] - obsPos[1];
      const dz = position[2] - obsPos[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return Math.max(0, distance - size[0] / 2);
    }
    case 'cylinder': {
      const dx = position[0] - obsPos[0];
      const dz = position[2] - obsPos[2];
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);
      const radius = size[0] / 2;
      const halfHeight = size[1] / 2;

      const verticalDist = Math.max(0, Math.abs(position[1] - obsPos[1]) - halfHeight);
      const radialDist = Math.max(0, horizontalDist - radius);

      return Math.sqrt(verticalDist * verticalDist + radialDist * radialDist);
    }
    default:
      return Infinity;
  }
};

export const computeDistanceBetweenLinks = (link1: OBB, link2: OBB): number => {
  const centers: [number, number, number] = [
    link2.center[0] - link1.center[0],
    link2.center[1] - link1.center[1],
    link2.center[2] - link1.center[2],
  ];

  const centerDistance = Math.sqrt(
    centers[0] * centers[0] + centers[1] * centers[1] + centers[2] * centers[2]
  );

  const maxRadius1 = Math.max(...link1.halfExtents);
  const maxRadius2 = Math.max(...link2.halfExtents);

  return Math.max(0, centerDistance - maxRadius1 - maxRadius2);
};

export const checkRobotSelfCollision = (
  linkOBBs: OBB[],
  collisionThreshold: number = 0.01
): boolean => {
  for (let i = 0; i < linkOBBs.length - 2; i++) {
    for (let j = i + 2; j < linkOBBs.length; j++) {
      if (checkOBBIntersection(linkOBBs[i], linkOBBs[j])) {
        const distance = computeDistanceBetweenLinks(linkOBBs[i], linkOBBs[j]);
        if (distance < collisionThreshold) {
          return true;
        }
      }
    }
  }
  return false;
};

export const checkRobotEnvironmentCollision = (
  linkOBBs: OBB[],
  obstacles: Obstacle[]
): boolean => {
  for (const linkOBB of linkOBBs) {
    const linkAABB: AABB = {
      min: [
        linkOBB.center[0] - linkOBB.halfExtents[0],
        linkOBB.center[1] - linkOBB.halfExtents[1],
        linkOBB.center[2] - linkOBB.halfExtents[2],
      ],
      max: [
        linkOBB.center[0] + linkOBB.halfExtents[0],
        linkOBB.center[1] + linkOBB.halfExtents[1],
        linkOBB.center[2] + linkOBB.halfExtents[2],
      ],
    };

    for (const obstacle of obstacles) {
      const obstacleAABB = createAABBFromObstacle(obstacle);
      if (checkAABBIntersection(linkAABB, obstacleAABB)) {
        if (obstacle.type === 'box') {
          return true;
        }
      }
    }
  }
  return false;
};

export const checkMultiRobotCollision = (
  robot1Links: OBB[],
  robot2Links: OBB[]
): boolean => {
  for (const link1 of robot1Links) {
    for (const link2 of robot2Links) {
      if (checkOBBIntersection(link1, link2)) {
        return true;
      }
    }
  }
  return false;
};

export const getCollisionWarningLevel = (
  distance: number
): CollisionWarning['level'] => {
  if (distance < 0.05) return 'emergency';
  if (distance < 0.15) return 'danger';
  if (distance < 0.3) return 'warning';
  return 'safe';
};

export const checkAllCollisions = (
  robotLinkOBBs: OBB[][],
  obstacles: Obstacle[],
  robotModels: RobotModel[]
): CollisionWarning[] => {
  const warnings: CollisionWarning[] = [];

  for (let r = 0; r < robotLinkOBBs.length; r++) {
    const links = robotLinkOBBs[r];

    if (checkRobotSelfCollision(links)) {
      warnings.push({
        level: 'emergency',
        distance: 0,
        obstacleId: 'self',
        robotId: robotModels[r].id,
      });
    }

    if (checkRobotEnvironmentCollision(links, obstacles)) {
      warnings.push({
        level: 'danger',
        distance: 0,
        obstacleId: 'environment',
        robotId: robotModels[r].id,
      });
    }

    for (let r2 = r + 1; r2 < robotLinkOBBs.length; r2++) {
      if (checkMultiRobotCollision(links, robotLinkOBBs[r2])) {
        warnings.push({
          level: 'emergency',
          distance: 0,
          obstacleId: robotModels[r2].id,
          robotId: robotModels[r].id,
        });
      }
    }
  }

  return warnings;
};
