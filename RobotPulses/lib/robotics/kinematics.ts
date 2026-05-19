import * as THREE from 'three';
import type { DHParameter, RobotPose } from '@/types/robot';

type Matrix4 = THREE.Matrix4;
const Matrix4 = THREE.Matrix4;

export const dhToMatrix = (dh: DHParameter): Matrix4 => {
  const { alpha, a, d, theta } = dh;
  const cosAlpha = Math.cos(alpha);
  const sinAlpha = Math.sin(alpha);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  return new Matrix4().set(
    cosTheta, -sinTheta * cosAlpha, sinTheta * sinAlpha, a * cosTheta,
    sinTheta, cosTheta * cosAlpha, -cosTheta * sinAlpha, a * sinTheta,
    0, sinAlpha, cosAlpha, d,
    0, 0, 0, 1
  );
};

export const forwardKinematics = (
  dhParameters: DHParameter[],
  jointAngles: number[],
  basePosition: [number, number, number]
): { position: [number, number, number]; orientation: [number, number, number, number]; linkTransforms: Matrix4[] } => {
  const transforms: Matrix4[] = [];
  let cumulativeTransform = new Matrix4().setPosition(basePosition[0], basePosition[1], basePosition[2]);

  transforms.push(cumulativeTransform.clone());

  for (let i = 0; i < dhParameters.length; i++) {
    const dh = { ...dhParameters[i], theta: dhParameters[i].theta + jointAngles[i] };
    const linkTransform = dhToMatrix(dh);
    cumulativeTransform = cumulativeTransform.multiply(linkTransform);
    transforms.push(cumulativeTransform.clone());
  }

  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  cumulativeTransform.decompose(position, quaternion, new THREE.Vector3());

  return {
    position: [position.x, position.y, position.z],
    orientation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    linkTransforms: transforms,
  };
};

export const computeJacobian = (
  dhParameters: DHParameter[],
  jointAngles: number[],
  basePosition: [number, number, number]
): number[][] => {
  const { linkTransforms } = forwardKinematics(dhParameters, jointAngles, basePosition);
  const endTransform = linkTransforms[linkTransforms.length - 1];
  const endPosition = new THREE.Vector3();
  endTransform.decompose(endPosition, new THREE.Quaternion(), new THREE.Vector3());

  const jacobian: number[][] = [];

  for (let i = 0; i < 6; i++) {
    const linkTransform = linkTransforms[i];
    const linkPosition = new THREE.Vector3();
    const linkQuaternion = new THREE.Quaternion();
    linkTransform.decompose(linkPosition, linkQuaternion, new THREE.Vector3());

    const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(linkQuaternion);
    const r = new THREE.Vector3().subVectors(endPosition, linkPosition);
    const cross = new THREE.Vector3().crossVectors(zAxis, r);

    jacobian.push([cross.x, cross.y, cross.z, zAxis.x, zAxis.y, zAxis.z]);
  }

  return jacobian;
};

export const checkSingularity = (jacobian: number[][], threshold: number = 0.001): boolean => {
  const jMatrix = new THREE.Matrix3().set(
    jacobian[0][0], jacobian[1][0], jacobian[2][0],
    jacobian[0][1], jacobian[1][1], jacobian[2][1],
    jacobian[0][2], jacobian[1][2], jacobian[2][2]
  );

  const determinant = jMatrix.determinant();
  return Math.abs(determinant) < threshold;
};

export const inverseKinematics = (
  dhParameters: DHParameter[],
  targetPosition: [number, number, number],
  targetOrientation: [number, number, number, number],
  initialGuess: number[],
  basePosition: [number, number, number],
  maxIterations: number = 100,
  tolerance: number = 0.001
): number[] | null => {
  let currentJoints = [...initialGuess];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const { position, orientation } = forwardKinematics(dhParameters, currentJoints, basePosition);

    const posError = [
      targetPosition[0] - position[0],
      targetPosition[1] - position[1],
      targetPosition[2] - position[2],
    ];

    const targetQuat = new THREE.Quaternion(targetOrientation[0], targetOrientation[1], targetOrientation[2], targetOrientation[3]);
    const currentQuat = new THREE.Quaternion(orientation[0], orientation[1], orientation[2], orientation[3]);
    const errorQuat = new THREE.Quaternion().multiplyQuaternions(targetQuat, currentQuat.invert());

    const angle = 2 * Math.acos(Math.min(1, Math.abs(errorQuat.w)));
    const axis = new THREE.Vector3(errorQuat.x, errorQuat.y, errorQuat.z).normalize();
    const rotError = [axis.x * angle, axis.y * angle, axis.z * angle];

    const error = [...posError, ...rotError];
    const errorNorm = Math.sqrt(error.reduce((sum, e) => sum + e * e, 0));

    if (errorNorm < tolerance) {
      return currentJoints;
    }

    const jacobian = computeJacobian(dhParameters, currentJoints, basePosition);
    const jacobianPseudoInverse = computePseudoInverse(jacobian);

    const deltaJoints = new Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        deltaJoints[i] += jacobianPseudoInverse[i][j] * error[j];
      }
    }

    const maxDelta = 0.1;
    const deltaNorm = Math.sqrt(deltaJoints.reduce((sum, d) => sum + d * d, 0));
    if (deltaNorm > maxDelta) {
      const scale = maxDelta / deltaNorm;
      deltaJoints.forEach((_, i) => deltaJoints[i] *= scale);
    }

    currentJoints = currentJoints.map((j, i) => j + deltaJoints[i]);
  }

  return null;
};

const computePseudoInverse = (matrix: number[][]): number[][] => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];

  const jtj: number[][] = [];
  for (let i = 0; i < cols; i++) {
    jtj[i] = [];
    for (let j = 0; j < cols; j++) {
      jtj[i][j] = 0;
      for (let k = 0; k < rows; k++) {
        jtj[i][j] += matrix[k][i] * matrix[k][j];
      }
    }
  }

  const damping = 0.01;
  for (let i = 0; i < cols; i++) {
    jtj[i][i] += damping * damping;
  }

  const inverse = invertMatrix(jtj);
  if (!inverse) return matrix.map(row => row.map(() => 0));

  for (let i = 0; i < cols; i++) {
    result[i] = [];
    for (let j = 0; j < rows; j++) {
      result[i][j] = 0;
      for (let k = 0; k < cols; k++) {
        result[i][j] += inverse[i][k] * matrix[j][k];
      }
    }
  }

  return result;
};

const invertMatrix = (matrix: number[][]): number[][] | null => {
  const n = matrix.length;
  const augmented: number[][] = [];

  for (let i = 0; i < n; i++) {
    augmented[i] = [...matrix[i], ...new Array(n).fill(0)];
    augmented[i][n + i] = 1;
  }

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) return null;

    for (let j = i; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i && Math.abs(augmented[k][i]) > 1e-10) {
        const factor = augmented[k][i];
        for (let j = i; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  const inverse: number[][] = [];
  for (let i = 0; i < n; i++) {
    inverse[i] = augmented[i].slice(n);
  }

  return inverse;
};
