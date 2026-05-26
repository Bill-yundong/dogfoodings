import type { StateVector } from "../types/orbital";

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + p * ax);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export interface PcInput {
  targetState: StateVector;
  debrisState: StateVector;
  combinedRadiusM: number;
  sigmaPosKm: number;
  covarianceScale?: number;
}

export interface PcResult {
  pc: number;
  mahalanobis: number;
}

/**
 * Foster's approximation for 3D Pc with anisotropic covariance
 * projected onto the encounter plane (position only).
 * Uses the 1D erf approximation for fast scanning; covariance is
 * isotropic in position for this analysis tool.
 */
export function computePc(input: PcInput): PcResult {
  const { targetState, debrisState, combinedRadiusM, sigmaPosKm } = input;
  const scale = input.covarianceScale ?? 1.0;

  const dx = targetState.positionKm[0] - debrisState.positionKm[0];
  const dy = targetState.positionKm[1] - debrisState.positionKm[1];
  const dz = targetState.positionKm[2] - debrisState.positionKm[2];
  const missKm = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const rv = targetState.velocityKmS;
  const dv = debrisState.velocityKmS;
  const vrx = rv[0] - dv[0];
  const vry = rv[1] - dv[1];
  const vrz = rv[2] - dv[2];
  const vRel = Math.sqrt(vrx * vrx + vry * vry + vrz * vrz);

  const sigmaKm = sigmaPosKm * scale;
  const combinedRadiusKm = combinedRadiusM / 1000;

  if (vRel <= 1e-6 || sigmaKm <= 0) {
    return { pc: 0, mahalanobis: missKm / Math.max(sigmaKm, 1e-6) };
  }

  const mahalanobis = missKm / sigmaKm;

  const a = (combinedRadiusKm + missKm) / (Math.SQRT2 * sigmaKm);
  const b = Math.max(0, (combinedRadiusKm - missKm) / (Math.SQRT2 * sigmaKm));
  const s = 0.5 * (erf(a) - erf(b));
  const pc = Math.max(0, Math.min(1, s));

  return { pc, mahalanobis };
}
