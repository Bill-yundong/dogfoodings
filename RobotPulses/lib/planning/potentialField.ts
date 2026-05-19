import type { APFParameters, Obstacle, RobotPose } from '@/types/robot';

export const defaultAPFParameters: APFParameters = {
  kAtt: 5.0,
  kRep: 20.0,
  d0: 0.5,
  maxForce: 10.0,
  gain: 0.01,
};

export interface APFTarget {
  position: [number, number, number];
}

export const computeAttractiveForce = (
  currentPosition: [number, number, number],
  targetPosition: [number, number, number],
  kAtt: number
): [number, number, number] => {
  const dx = targetPosition[0] - currentPosition[0];
  const dy = targetPosition[1] - currentPosition[1];
  const dz = targetPosition[2] - currentPosition[2];

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance < 0.001) {
    return [0, 0, 0];
  }

  const force = kAtt * distance;
  return [
    (dx / distance) * force,
    (dy / distance) * force,
    (dz / distance) * force,
  ];
};

export const computeRepulsiveForce = (
  currentPosition: [number, number, number],
  obstacles: Obstacle[],
  kRep: number,
  d0: number
): [number, number, number] => {
  let totalForce: [number, number, number] = [0, 0, 0];

  for (const obstacle of obstacles) {
    const closestPoint = getClosestPointOnObstacle(currentPosition, obstacle);
    const dx = currentPosition[0] - closestPoint[0];
    const dy = currentPosition[1] - closestPoint[1];
    const dz = currentPosition[2] - closestPoint[2];

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < 0.001) {
      const pushForce = kRep * (1 / d0 - 1 / 0.001) * (1 / (0.001 * 0.001));
      totalForce[0] += pushForce;
      continue;
    }

    if (distance <= d0) {
      const forceMagnitude = kRep * (1 / distance - 1 / d0) * (1 / (distance * distance));
      totalForce[0] += (dx / distance) * forceMagnitude;
      totalForce[1] += (dy / distance) * forceMagnitude;
      totalForce[2] += (dz / distance) * forceMagnitude;
    }
  }

  return totalForce;
};

export const computeRepulsiveForceFromRobots = (
  currentPosition: [number, number, number],
  otherRobots: Array<{ position: [number, number, number]; radius: number }>,
  kRep: number,
  d0: number
): [number, number, number] => {
  let totalForce: [number, number, number] = [0, 0, 0];

  for (const robot of otherRobots) {
    const dx = currentPosition[0] - robot.position[0];
    const dy = currentPosition[1] - robot.position[1];
    const dz = currentPosition[2] - robot.position[2];

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const effectiveDistance = distance - robot.radius;

    if (effectiveDistance < 0.001) {
      const pushForce = kRep * 10;
      totalForce[0] += (dx || 1) * pushForce;
      totalForce[1] += (dy || 1) * pushForce;
      totalForce[2] += (dz || 1) * pushForce;
      continue;
    }

    if (effectiveDistance <= d0) {
      const forceMagnitude = kRep * (1 / effectiveDistance - 1 / d0) * (1 / (effectiveDistance * effectiveDistance));
      totalForce[0] += (dx / distance) * forceMagnitude;
      totalForce[1] += (dy / distance) * forceMagnitude;
      totalForce[2] += (dz / distance) * forceMagnitude;
    }
  }

  return totalForce;
};

const getClosestPointOnObstacle = (
  point: [number, number, number],
  obstacle: Obstacle
): [number, number, number] => {
  const { type, position, size } = obstacle;

  switch (type) {
    case 'box': {
      const halfSize = [size[0] / 2, size[1] / 2, size[2] / 2];
      return [
        Math.max(position[0] - halfSize[0], Math.min(position[0] + halfSize[0], point[0])),
        Math.max(position[1] - halfSize[1], Math.min(position[1] + halfSize[1], point[1])),
        Math.max(position[2] - halfSize[2], Math.min(position[2] + halfSize[2], point[2])),
      ];
    }
    case 'sphere': {
      const dx = point[0] - position[0];
      const dy = point[1] - position[1];
      const dz = point[2] - position[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < 0.001) {
        return [position[0] + size[0] / 2, position[1], position[2]];
      }
      const radius = size[0] / 2;
      return [
        position[0] + (dx / distance) * radius,
        position[1] + (dy / distance) * radius,
        position[2] + (dz / distance) * radius,
      ];
    }
    case 'cylinder': {
      const dx = point[0] - position[0];
      const dz = point[2] - position[2];
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);
      const radius = size[0] / 2;
      const halfHeight = size[1] / 2;

      let closestX: number, closestY: number, closestZ: number;

      if (horizontalDist > radius) {
        closestX = position[0] + (dx / horizontalDist) * radius;
        closestZ = position[2] + (dz / horizontalDist) * radius;
      } else {
        closestX = point[0];
        closestZ = point[2];
      }

      closestY = Math.max(position[1] - halfHeight, Math.min(position[1] + halfHeight, point[1]));

      return [closestX, closestY, closestZ];
    }
    default:
      return position;
  }
};

export const computeTotalForce = (
  currentPosition: [number, number, number],
  target: APFTarget,
  obstacles: Obstacle[],
  otherRobots: Array<{ position: [number, number, number]; radius: number }>,
  params: APFParameters
): [number, number, number] => {
  const attForce = computeAttractiveForce(currentPosition, target.position, params.kAtt);
  const repForceObs = computeRepulsiveForce(currentPosition, obstacles, params.kRep, params.d0);
  const repForceRobots = computeRepulsiveForceFromRobots(currentPosition, otherRobots, params.kRep * 1.5, params.d0 * 2);

  const totalForce: [number, number, number] = [
    attForce[0] + repForceObs[0] + repForceRobots[0],
    attForce[1] + repForceObs[1] + repForceRobots[1],
    attForce[2] + repForceObs[2] + repForceRobots[2],
  ];

  const forceMagnitude = Math.sqrt(
    totalForce[0] * totalForce[0] +
    totalForce[1] * totalForce[1] +
    totalForce[2] * totalForce[2]
  );

  if (forceMagnitude > params.maxForce) {
    const scale = params.maxForce / forceMagnitude;
    return [
      totalForce[0] * scale,
      totalForce[1] * scale,
      totalForce[2] * scale,
    ];
  }

  return totalForce;
};

export const computeJointVelocityFromForce = (
  force: [number, number, number],
  jacobian: number[][],
  maxJointVelocities: number[]
): number[] => {
  const taskSpaceVelocity = [force[0], force[1], force[2], 0, 0, 0];

  const jointVelocities: number[] = new Array(6).fill(0);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      jointVelocities[i] += jacobian[j][i] * taskSpaceVelocity[j];
    }
  }

  const maxScaledVel = jointVelocities.reduce((max, vel, i) => {
    const scaled = Math.abs(vel) / maxJointVelocities[i];
    return Math.max(max, scaled);
  }, 0);

  if (maxScaledVel > 1) {
    for (let i = 0; i < 6; i++) {
      jointVelocities[i] /= maxScaledVel;
    }
  }

  return jointVelocities;
};

export const asyncAPFPlanning = async (
  currentPosition: [number, number, number],
  target: APFTarget,
  obstacles: Obstacle[],
  otherRobots: Array<{ position: [number, number, number]; radius: number }>,
  params: APFParameters
): Promise<[number, number, number]> => {
  await new Promise(resolve => setTimeout(resolve, 0));

  return computeTotalForce(currentPosition, target, obstacles, otherRobots, params);
};
