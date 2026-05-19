import type { RobotModel, DHParameter } from '@/types/robot';

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

export const createStandardDHParameters = (): DHParameter[] => [
  { alpha: -Math.PI / 2, a: 0, d: 0.330, theta: 0 },
  { alpha: 0, a: -0.425, d: 0, theta: -Math.PI / 2 },
  { alpha: 0, a: -0.3922, d: 0, theta: 0 },
  { alpha: Math.PI / 2, a: 0, d: 0.0997, theta: -Math.PI / 2 },
  { alpha: -Math.PI / 2, a: 0, d: 0.0996, theta: 0 },
  { alpha: 0, a: 0, d: 0.099, theta: 0 },
];

export const defaultRobotModels: RobotModel[] = [
  {
    id: 'robot-01',
    name: '机械臂 A',
    color: '#06b6d4',
    basePosition: [-2, 0, 0],
    dhParameters: createStandardDHParameters(),
    jointLimits: [
      { min: degToRad(-170), max: degToRad(170) },
      { min: degToRad(-120), max: degToRad(120) },
      { min: degToRad(-170), max: degToRad(170) },
      { min: degToRad(-170), max: degToRad(170) },
      { min: degToRad(-170), max: degToRad(170) },
      { min: degToRad(-180), max: degToRad(180) },
    ],
    maxJointVelocities: [2.175, 2.175, 2.175, 3.67, 3.67, 3.67],
    linkDimensions: [
      { length: 0.330, radius: 0.08 },
      { length: 0.425, radius: 0.07 },
      { length: 0.3922, radius: 0.06 },
      { length: 0.0997, radius: 0.05 },
      { length: 0.0996, radius: 0.045 },
      { length: 0.099, radius: 0.04 },
    ],
  },
  {
    id: 'robot-02',
    name: '机械臂 B',
    color: '#10b981',
    basePosition: [2, 0, 0],
    dhParameters: createStandardDHParameters(),
    jointLimits: [
      { min: degToRad(-170), max: degToRad(170) },
      { min: degToRad(-120), max: degToRad(120) },
      { min: degToRad(-170), max: degToRad(170) },
      { min: degToRad(-170), max: degToRad(170) },
      { min: degToRad(-170), max: degToRad(170) },
      { min: degToRad(-180), max: degToRad(180) },
    ],
    maxJointVelocities: [2.175, 2.175, 2.175, 3.67, 3.67, 3.67],
    linkDimensions: [
      { length: 0.330, radius: 0.08 },
      { length: 0.425, radius: 0.07 },
      { length: 0.3922, radius: 0.06 },
      { length: 0.0997, radius: 0.05 },
      { length: 0.0996, radius: 0.045 },
      { length: 0.099, radius: 0.04 },
    ],
  },
];

export const createInitialJoints = (): number[] => [0, -Math.PI / 2, Math.PI / 2, 0, 0, 0];

export const clampJointAngle = (angle: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, angle));
};

export const checkJointLimits = (
  joints: number[],
  limits: Array<{ min: number; max: number }>
): boolean => {
  return joints.every((joint, i) => joint >= limits[i].min && joint <= limits[i].max);
};
